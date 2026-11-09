import { useEffect, useState } from "react";
import "./App.css";

import Login from "./pages/Login";
import Register from "./pages/Register";
import Transactions from "./pages/Transactions";
import Budget from "./pages/Budget";
import Analytics from "./pages/Analytics";
import AIInsights from "./pages/AIInsights";
import Settings from "./pages/Settings";
import SavingsGoals from "./pages/SavingsGoals";

const API = "http://localhost:5001/api";

const DEFAULT_SETTINGS = {
  name: "Dnyaneshwar",
  email: "",
  theme: "light",
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
  weekStarts: "Monday",
  budgetAlert: "80",
  budgetNotifications: true,
  goalNotifications: true,
  monthlySummary: true,
};

function getSavedSettings() {
  try {
    const saved = localStorage.getItem("budgetmind-settings");

    return saved
      ? { ...DEFAULT_SETTINGS, ...JSON.parse(saved) }
      : { ...DEFAULT_SETTINGS };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

function getLocalDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function getLocalMonthKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");

  return `${year}-${month}`;
}

function formatMoney(amount, currency = "INR") {
  const locale = currency === "INR" ? "en-IN" : "en-US";

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(amount || 0));
  } catch {
    return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
  }
}

function formatDate(dateValue, dateFormat = "DD/MM/YYYY") {
  if (!dateValue) return "—";

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) return "—";

  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  if (dateFormat === "MM/DD/YYYY") {
    return `${month}/${day}/${year}`;
  }

  if (dateFormat === "YYYY-MM-DD") {
    return `${year}-${month}-${day}`;
  }

  return `${day}/${month}/${year}`;
}

function App() {
  const [page, setPage] = useState("login");
  const [checkingAuth, setCheckingAuth] = useState(true);

  const [transactions, setTransactions] = useState([]);
  const [budgets, setBudgets] = useState([]);
  const [savingsGoals, setSavingsGoals] = useState([]);

  const [showNotifications, setShowNotifications] = useState(false);

  // Global application settings
  const [settings, setSettings] = useState(getSavedSettings);

  // Notification history
  const [notificationHistory, setNotificationHistory] = useState(() => {
    try {
      const saved = localStorage.getItem(
        "budgetmind-notifications"
      );

      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currency = settings.currency || "INR";
  const dateFormat = settings.dateFormat || "DD/MM/YYYY";
  const displayName = settings.name?.trim() || "User";

  // Global money formatter
  const money = (amount) => formatMoney(amount, currency);

  // Listen for changes made in Settings
  useEffect(() => {
    const updateSettings = () => {
      setSettings(getSavedSettings());
    };

    window.addEventListener(
      "budgetmind-settings-updated",
      updateSettings
    );

    window.addEventListener("storage", updateSettings);

    return () => {
      window.removeEventListener(
        "budgetmind-settings-updated",
        updateSettings
      );

      window.removeEventListener("storage", updateSettings);
    };
  }, []);

  // Apply saved theme
  useEffect(() => {
    document.documentElement.setAttribute(
      "data-theme",
      settings.theme || "light"
    );

    localStorage.setItem(
      "budgetmind-theme",
      settings.theme || "light"
    );
  }, [settings.theme]);

  // Page navigation
  const changePage = (newPage) => {
    setPage(newPage);
    setShowNotifications(false);

    window.history.pushState(
      { page: newPage },
      "",
      `#${newPage}`
    );
  };

  // Browser back button
  useEffect(() => {
    const handleBack = () => {
      const hash = window.location.hash.replace("#", "");

      const validPages = [
        "login",
        "register",
        "dashboard",
        "transactions",
        "budget",
        "analytics",
        "ai-insights",
        "settings",
        "savings-goals",
      ];

      setPage(
        validPages.includes(hash) ? hash : "dashboard"
      );
    };

    window.addEventListener("popstate", handleBack);

    return () => {
      window.removeEventListener("popstate", handleBack);
    };
  }, []);

  // Fetch transactions
  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API}/transactions`, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      } else {
        console.error(
          "Failed to load transactions:",
          data.message
        );
      }
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    }
  };

  // Fetch budgets
  const fetchBudgets = async () => {
    try {
      const response = await fetch(`${API}/budgets`, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setBudgets(data.budgets || []);
      } else {
        console.error(
          "Failed to load budgets:",
          data.message
        );
      }
    } catch (error) {
      console.error("Failed to fetch budgets:", error);
    }
  };

  // Fetch savings goals
  const fetchSavingsGoals = async () => {
    try {
      const response = await fetch(`${API}/savings-goals`, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setSavingsGoals(data.goals || []);
      } else {
        console.error(
          "Failed to load savings goals:",
          data.message
        );
      }
    } catch (error) {
      console.error("Failed to fetch savings goals:", error);
    }
  };

  // Check authentication
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const response = await fetch(`${API}/auth/me`, {
          credentials: "include",
        });

        if (response.ok) {
          setPage("dashboard");

          window.history.replaceState(
            { page: "dashboard" },
            "",
            "#dashboard"
          );
        } else {
          setPage("login");

          window.history.replaceState(
            { page: "login" },
            "",
            "#login"
          );
        }
      } catch (error) {
        console.error("Auth check failed:", error);
        setPage("login");
      } finally {
        setCheckingAuth(false);
      }
    };

    checkAuth();
  }, []);

  // Refresh dashboard information
  useEffect(() => {
    if (page === "dashboard") {
      fetchTransactions();
      fetchBudgets();
      fetchSavingsGoals();
    }
  }, [page]);

  // Current month
  const currentMonth = getLocalMonthKey(new Date());

  // Current month transactions
  const currentMonthTransactions = transactions.filter(
    (transaction) => {
      if (!transaction.date) return false;

      const date = new Date(transaction.date);

      return (
        !Number.isNaN(date.getTime()) &&
        getLocalMonthKey(date) === currentMonth
      );
    }
  );

  // Income
  const income = currentMonthTransactions
    .filter((transaction) => transaction.type === "income")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount || 0),
      0
    );

  // Expenses
  const expenses = currentMonthTransactions
    .filter((transaction) => transaction.type === "expense")
    .reduce(
      (total, transaction) =>
        total + Number(transaction.amount || 0),
      0
    );

  const balance = income - expenses;

  const savingsRate =
    income > 0
      ? ((balance / income) * 100).toFixed(1)
      : "0.0";

  // Savings goals calculations
  const totalSavingsGoals = savingsGoals.length;

  const totalSavedAmount = savingsGoals.reduce(
    (total, goal) =>
      total + Number(goal.savedAmount || 0),
    0
  );

  const totalSavingsTarget = savingsGoals.reduce(
    (total, goal) =>
      total + Number(goal.targetAmount || 0),
    0
  );

  const savingsGoalProgress =
    totalSavingsTarget > 0
      ? Math.min(
          (totalSavedAmount / totalSavingsTarget) * 100,
          100
        )
      : 0;

  // Current month budgets
  const currentBudgets = budgets.filter(
    (budget) => budget.month === currentMonth
  );

  // Calculate budget spending
  const getBudgetSpent = (budget) => {
    const category = (budget.category || "")
      .trim()
      .toLowerCase();

    return transactions
      .filter((transaction) => {
        if (transaction.type !== "expense") return false;

        const transactionCategory = (
          transaction.category || ""
        )
          .trim()
          .toLowerCase();

        const transactionDate = transaction.date
          ? new Date(transaction.date)
          : null;

        if (
          !transactionDate ||
          Number.isNaN(transactionDate.getTime())
        ) {
          return false;
        }

        return (
          transactionCategory === category &&
          getLocalMonthKey(transactionDate) === budget.month
        );
      })
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      );
  };

  // Budget notifications using saved preferences
  const alertThreshold =
    Number(settings.budgetAlert || 80) / 100;

  const notifications = settings.budgetNotifications
    ? currentBudgets
        .map((budget) => {
          const spent = getBudgetSpent(budget);
          const limit = Number(budget.amount) || 0;

          if (limit <= 0) return null;

          if (spent > limit) {
            return {
              id: budget._id || budget.category,
              category: budget.category,
              type: "danger",
              title: "Budget exceeded",
              message: `Over budget by ${money(spent - limit)}`,
            };
          }

          if (spent >= limit * alertThreshold) {
            return {
              id: budget._id || budget.category,
              category: budget.category,
              type: "warning",
              title: "Budget almost used",
              message: `You have used ${(
                (spent / limit) *
                100
              ).toFixed(1)}% of your budget.`,
            };
          }

          return null;
        })
        .filter(Boolean)
    : [];

  // Save new budget alerts in notification history
  const notificationSignature = JSON.stringify(notifications);

  useEffect(() => {
    setNotificationHistory((previous) => {
      const updated = [...previous];

      notifications.forEach((notification) => {
        const existingIndex = updated.findIndex(
          (item) => item.id === notification.id
        );

        if (existingIndex === -1) {
          updated.unshift({
            ...notification,
            read: false,
            createdAt: new Date().toISOString(),
          });
        } else {
          const existing = updated[existingIndex];

          updated[existingIndex] = {
            ...existing,
            ...notification,
            read: existing.read,
            createdAt: existing.createdAt,
          };
        }
      });

      return updated.slice(0, 50);
    });
  }, [notificationSignature]);

  // Save notification history in localStorage
  useEffect(() => {
    localStorage.setItem(
      "budgetmind-notifications",
      JSON.stringify(notificationHistory)
    );
  }, [notificationHistory]);

  // Unread notification count
  const unreadCount = notificationHistory.filter(
    (notification) => !notification.read
  ).length;

  // Mark one notification as read
  const markNotificationRead = (id) => {
    setNotificationHistory((previous) =>
      previous.map((notification) =>
        notification.id === id
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all notifications as read
  const markAllNotificationsRead = () => {
    setNotificationHistory((previous) =>
      previous.map((notification) => ({
        ...notification,
        read: true,
      }))
    );
  };

  // Clear notification history
  const clearAllNotifications = () => {
    if (
      window.confirm(
        "Are you sure you want to clear all notifications?"
      )
    ) {
      setNotificationHistory([]);
    }
  };

  // Last seven days spending
  const getWeeklySpending = () => {
    const today = new Date();
    const days = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dateKey = getLocalDateKey(date);

      const dayName = date.toLocaleDateString("en-IN", {
        weekday: "short",
      });

      const amount = transactions
        .filter((transaction) => {
          if (
            transaction.type !== "expense" ||
            !transaction.date
          ) {
            return false;
          }

          const transactionDate = new Date(
            transaction.date
          );

          return (
            !Number.isNaN(transactionDate.getTime()) &&
            getLocalDateKey(transactionDate) === dateKey
          );
        })
        .reduce(
          (total, transaction) =>
            total + Number(transaction.amount || 0),
          0
        );

      days.push({
        dateKey,
        dayName,
        amount,
      });
    }

    return days;
  };

  const weeklySpending = getWeeklySpending();

  const maxWeeklySpending = Math.max(
    ...weeklySpending.map((day) => day.amount),
    1
  );

  const hasWeeklySpending = weeklySpending.some(
    (day) => day.amount > 0
  );

  // Greeting
  const currentHour = new Date().getHours();

  const greeting =
    currentHour < 12
      ? "Good Morning"
      : currentHour < 17
      ? "Good Afternoon"
      : "Good Evening";

  // Loading screen
  if (checkingAuth) {
    return (
      <div className="page-content">
        Loading BudgetMind...
      </div>
    );
  }

  // Login page
  if (page === "login") {
    return (
      <Login
        onLogin={() => changePage("dashboard")}
        onRegister={() => changePage("register")}
      />
    );
  }

  // Register page
  if (page === "register") {
    return (
      <Register
        onRegister={() => changePage("login")}
        onLogin={() => changePage("login")}
      />
    );
  }

  // Other pages
  if (page === "transactions") return <Transactions />;
  if (page === "budget") return <Budget />;
  if (page === "analytics") return <Analytics />;
  if (page === "ai-insights") return <AIInsights />;
  if (page === "settings") return <Settings />;
  if (page === "savings-goals") return <SavingsGoals />;

  // Dashboard
  return (
    <div className="app">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="logo">
          <div className="logo-icon">₹</div>
          <span>BudgetMind</span>
        </div>

        <nav className="sidebar-nav">
          <button
            className={`nav-item ${
              page === "dashboard" ? "active" : ""
            }`}
            onClick={() => changePage("dashboard")}
          >
            <span>⌂</span>
            Dashboard
          </button>

          <button
            className={`nav-item ${
              page === "transactions" ? "active" : ""
            }`}
            onClick={() => changePage("transactions")}
          >
            <span>₹</span>
            Transactions
          </button>

          <button
            className={`nav-item ${
              page === "budget" ? "active" : ""
            }`}
            onClick={() => changePage("budget")}
          >
            <span>▣</span>
            Budgets
          </button>

          <button
            className={`nav-item ${
              page === "savings-goals" ? "active" : ""
            }`}
            onClick={() => changePage("savings-goals")}
          >
            <span>🎯</span>
            Savings Goals
          </button>

          <button
            className={`nav-item ${
              page === "analytics" ? "active" : ""
            }`}
            onClick={() => changePage("analytics")}
          >
            <span>◔</span>
            Analytics
          </button>

          <button
            className={`nav-item ${
              page === "ai-insights" ? "active" : ""
            }`}
            onClick={() => changePage("ai-insights")}
          >
            <span>✦</span>
            AI Insights
          </button>

          <button
            className={`nav-item ${
              page === "settings" ? "active" : ""
            }`}
            onClick={() => changePage("settings")}
          >
            <span>⚙</span>
            Settings
          </button>
        </nav>

        {/* Account information */}
        <div className="account-box">
          <div className="account-avatar">
            {displayName.charAt(0).toUpperCase()}
          </div>

          <div>
            <strong>{displayName}</strong>
            <p>Personal Account</p>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="main-content">
        {/* Header */}
        <header className="top-header">
          <div>
            <h1>
              {greeting}, {displayName}
            </h1>

            <p>Here's your financial overview</p>
          </div>

          <div className="header-actions">
            {/* Notification Centre */}
            <div className="notification-wrapper">
              <button
                className="icon-button notification-button"
                aria-label="Notifications"
                aria-expanded={showNotifications}
                onClick={() =>
                  setShowNotifications((isOpen) => !isOpen)
                }
              >
                🔔

                {unreadCount > 0 && (
                  <span className="notification-count">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </button>

              {showNotifications && (
                <div className="notification-dropdown">
                  <div className="notification-header">
                    <div>
                      <h3>Notification Centre</h3>

                      <p>
                        {notificationHistory.length} saved ·{" "}
                        {unreadCount} unread
                      </p>
                    </div>

                    <button
                      className="notification-close"
                      onClick={() =>
                        setShowNotifications(false)
                      }
                      aria-label="Close notifications"
                    >
                      ×
                    </button>
                  </div>

                  {/* Notification actions */}
                  {notificationHistory.length > 0 && (
                    <div
                      className="notification-actions"
                      style={{
                        display: "flex",
                        gap: "10px",
                        padding: "12px 16px",
                        borderBottom: "1px solid var(--border-color, #e5e7eb)",
                      }}
                    >
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        disabled={unreadCount === 0}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#15803d",
                          cursor:
                            unreadCount === 0
                              ? "not-allowed"
                              : "pointer",
                          fontWeight: 600,
                          fontSize: "12px",
                          opacity: unreadCount === 0 ? 0.5 : 1,
                        }}
                      >
                        Mark all as read
                      </button>

                      <button
                        type="button"
                        onClick={clearAllNotifications}
                        style={{
                          border: "none",
                          background: "transparent",
                          color: "#dc2626",
                          cursor: "pointer",
                          fontWeight: 600,
                          fontSize: "12px",
                        }}
                      >
                        Clear all
                      </button>
                    </div>
                  )}

                  {/* Notification history */}
                  {notificationHistory.length === 0 ? (
                    <div className="notification-empty">
                      <span>✓</span>
                      <strong>You're all caught up!</strong>
                      <p>No notifications in your history.</p>
                    </div>
                  ) : (
                    <div className="notification-list">
                      {notificationHistory.map((notification) => (
                        <div
                          className={`notification-item ${
                            notification.type
                          } ${
                            notification.read
                              ? "read"
                              : "unread"
                          }`}
                          key={notification.id}
                          style={{
                            opacity: notification.read ? 0.7 : 1,
                            background: notification.read
                              ? "transparent"
                              : "var(--notification-unread, rgba(21, 128, 61, 0.06))",
                          }}
                        >
                          <span className="notification-symbol">
                            {notification.type === "danger"
                              ? "!"
                              : "⚠"}
                          </span>

                          <div className="notification-content">
                            <strong>
                              {notification.category}:{" "}
                              {notification.title}
                            </strong>

                            <p>{notification.message}</p>

                            <small
                              style={{
                                display: "block",
                                marginTop: "6px",
                                opacity: 0.7,
                              }}
                            >
                              {formatDate(
                                notification.createdAt,
                                dateFormat
                              )}
                            </small>

                            {!notification.read && (
                              <button
                                type="button"
                                onClick={() =>
                                  markNotificationRead(
                                    notification.id
                                  )
                                }
                                style={{
                                  marginTop: "8px",
                                  border: "none",
                                  background: "transparent",
                                  padding: 0,
                                  color: "#15803d",
                                  cursor: "pointer",
                                  fontWeight: 600,
                                  fontSize: "12px",
                                }}
                              >
                                Mark as read
                              </button>
                            )}

                            {notification.read && (
                              <small
                                style={{
                                  display: "block",
                                  marginTop: "6px",
                                  color: "#15803d",
                                  fontWeight: 600,
                                }}
                              >
                                ✓ Read
                              </small>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Logout */}
            <button
              className="logout-button"
              onClick={async () => {
                try {
                  const response = await fetch(
                    `${API}/auth/logout`,
                    {
                      method: "POST",
                      credentials: "include",
                    }
                  );

                  if (response.ok) {
                    changePage("login");
                  } else {
                    alert(
                      "Logout failed. Please try again."
                    );
                  }
                } catch (error) {
                  console.error("Logout failed:", error);
                  alert(
                    "Unable to connect to the backend."
                  );
                }
              }}
            >
              Logout
            </button>
          </div>
        </header>

        {/* Financial summary */}
        <section className="summary-grid">
          <div className="summary-card">
            <p>This Month's Balance</p>
            <h2>{money(balance)}</h2>
            <span className="positive">
              Income minus expenses
            </span>
          </div>

          <div className="summary-card">
            <p>This Month's Income</p>
            <h2>{money(income)}</h2>
            <span className="positive">
              Monthly income
            </span>
          </div>

          <div className="summary-card">
            <p>This Month's Expenses</p>
            <h2>{money(expenses)}</h2>
            <span className="negative">
              Monthly expenses
            </span>
          </div>

          <div className="summary-card">
            <p>Monthly Savings Rate</p>
            <h2>{savingsRate}%</h2>
            <span className="positive">
              Based on this month's income
            </span>
          </div>
        </section>

        {/* Savings Goals Summary */}
        <section className="dashboard-card savings-summary-card">
          <div className="card-header">
            <div>
              <h2>Savings Goals Summary</h2>
              <p>
                Track your progress towards your financial goals
              </p>
            </div>

            <button
              className="view-button"
              onClick={() => changePage("savings-goals")}
            >
              Manage Goals
            </button>
          </div>

          <div className="savings-summary-grid">
            <div>
              <span>Active Goals</span>
              <h3>{totalSavingsGoals}</h3>
            </div>

            <div>
              <span>Total Saved</span>
              <h3>{money(totalSavedAmount)}</h3>
            </div>

            <div>
              <span>Total Target</span>
              <h3>{money(totalSavingsTarget)}</h3>
            </div>

            <div>
              <span>Overall Progress</span>
              <h3>
                {savingsGoalProgress.toFixed(1)}%
              </h3>
            </div>
          </div>

          <div className="savings-summary-progress">
            <div className="budget-top">
              <span>Overall savings progress</span>
              <strong>
                {savingsGoalProgress.toFixed(1)}%
              </strong>
            </div>

            <div className="progress">
              <div
                className="progress-fill"
                style={{
                  width: `${savingsGoalProgress}%`,
                }}
              />
            </div>
          </div>

          {totalSavingsGoals === 0 && (
            <p className="savings-summary-empty">
              No savings goals yet. Create your first goal to
              start tracking your progress.
            </p>
          )}
        </section>

        {/* Spending Overview and AI Insight */}
        <section className="dashboard-grid">
          <div className="dashboard-card spending-card">
            <div className="card-header">
              <div>
                <h2>Spending Overview</h2>
                <p>
                  Your expenses over the last 7 days
                </p>
              </div>
            </div>

            <div className="chart">
              {!hasWeeklySpending && (
                <p className="chart-empty">
                  No expenses recorded in the last 7 days.
                </p>
              )}

              {weeklySpending.map((day) => {
                const height =
                  day.amount > 0
                    ? Math.max(
                        (day.amount / maxWeeklySpending) * 100,
                        5
                      )
                    : 0;

                return (
                  <div
                    className="chart-bar"
                    key={day.dateKey}
                  >
                    <span className="chart-amount">
                      {day.amount > 0
                        ? money(day.amount)
                        : "—"}
                    </span>

                    <div className="chart-track">
                      <div
                        className="bar"
                        style={{
                          height: `${height}%`,
                        }}
                        title={`${day.dayName}: ${money(day.amount)}`}
                      />
                    </div>

                    <span className="chart-day">
                      {day.dayName}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* AI Financial Insight */}
          <div className="dashboard-card ai-card">
            <div className="ai-title">
              <span className="ai-icon">✦</span>

              <div>
                <h2>AI Financial Insight</h2>
                <p>
                  Smart analysis of your spending
                </p>
              </div>
            </div>

            <div className="ai-message">
              <p>
                Your expenses this month are{" "}
                <strong>{money(expenses)}</strong>.
              </p>

              <p>
                Visit AI Insights for your personalized
                financial overview.
              </p>
            </div>

            <button
              className="ai-button"
              onClick={() => changePage("ai-insights")}
            >
              View AI Insights →
            </button>
          </div>
        </section>

        {/* Recent Transactions and Budget Progress */}
        <section className="lower-grid">
          {/* Recent Transactions */}
          <div className="dashboard-card transactions-card">
            <div className="card-header">
              <div>
                <h2>Recent Transactions</h2>
                <p>
                  Your latest financial activity
                </p>
              </div>

              <button
                className="view-button"
                onClick={() => changePage("transactions")}
              >
                View All
              </button>
            </div>

            <div className="transactions-list">
              {transactions.length === 0 ? (
                <p>No transactions yet.</p>
              ) : (
                [...transactions]
                  .sort(
                    (a, b) =>
                      new Date(b.date).getTime() -
                      new Date(a.date).getTime()
                  )
                  .slice(0, 5)
                  .map((transaction) => (
                    <div
                      className="transaction"
                      key={transaction._id}
                    >
                      <div className="transaction-icon">
                        {transaction.type === "income"
                          ? "💰"
                          : "💸"}
                      </div>

                      <div className="transaction-info">
                        <strong>
                          {transaction.category}
                        </strong>

                        <span>
                          {formatDate(
                            transaction.date,
                            dateFormat
                          )}
                          {" • "}
                          {transaction.paymentMethod || "Other"}
                        </span>
                      </div>

                      <div
                        className={`transaction-amount ${
                          transaction.type === "income"
                            ? "income"
                            : "expense"
                        }`}
                      >
                        {transaction.type === "income"
                          ? "+"
                          : "-"}
                        {money(transaction.amount)}
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>

          {/* Budget Progress */}
          <div className="dashboard-card budget-card">
            <div className="card-header">
              <div>
                <h2>Budget Progress</h2>
                <p>
                  {new Date().toLocaleDateString("en-IN", {
                    month: "long",
                    year: "numeric",
                  })}
                </p>
              </div>

              <button
                className="view-button"
                onClick={() => changePage("budget")}
              >
                Manage
              </button>
            </div>

            {currentBudgets.length === 0 ? (
              <p>
                No budgets saved for this month yet. Select
                Manage to add one.
              </p>
            ) : (
              currentBudgets.map((budget) => {
                const spent = getBudgetSpent(budget);
                const limit = Number(budget.amount) || 0;

                const percentage =
                  limit > 0 ? (spent / limit) * 100 : 0;

                const barWidth = Math.min(
                  percentage,
                  100
                );

                const barColor =
                  percentage >= 100
                    ? "#dc2626"
                    : percentage >=
                      Number(settings.budgetAlert || 80)
                    ? "#f59e0b"
                    : "#15803d";

                return (
                  <div
                    className="budget-item"
                    key={budget._id}
                  >
                    <div className="budget-top">
                      <span>{budget.category}</span>

                      <strong>
                        {money(spent)} / {money(limit)}
                      </strong>
                    </div>

                    <div className="progress">
                      <div
                        className="progress-fill"
                        style={{
                          width: `${barWidth}%`,
                          background: barColor,
                        }}
                      />
                    </div>

                    <small>
                      {percentage.toFixed(1)}% used
                      {percentage > 100
                        ? " — Over budget"
                        : ""}
                    </small>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </main>
    </div>
  );
}

export default App;