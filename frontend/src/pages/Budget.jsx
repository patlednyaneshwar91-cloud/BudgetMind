
import { useEffect, useMemo, useState } from "react";

const DEFAULT_CATEGORIES = [
  "Food",
  "Travel",
  "Shopping",
  "Entertainment",
  "Bills",
  "Health",
  "Education",
  "Rent",
  "Groceries",
  "Other",
];

const API = "http://localhost:5001/api/budgets";
const TRANSACTION_API = "http://localhost:5001/api/transactions";
const CATEGORY_API = "http://localhost:5001/api/categories";

const DEFAULT_SETTINGS = {
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
};

function getSavedSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("budgetmind-settings")
    );

    return { ...DEFAULT_SETTINGS, ...(saved || {}) };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

function getCurrentMonth() {
  const now = new Date();

  return `${now.getFullYear()}-${String(
    now.getMonth() + 1
  ).padStart(2, "0")}`;
}

function formatMonth(value, dateFormat) {
  if (!value) return "Selected month";

  const [year, month] = value.split("-");

  if (dateFormat === "YYYY-MM-DD") {
    return `${year}-${month}`;
  }

  if (dateFormat === "MM/DD/YYYY") {
    return `${month}/${year}`;
  }

  return `${month}/${year}`;
}

function Budget() {
  const [settings, setSettings] = useState(getSavedSettings);

  const [budgets, setBudgets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);

  const [category, setCategory] = useState("");
  const [customCategory, setCustomCategory] = useState("");
  const [isCustom, setIsCustom] = useState(false);

  const [amount, setAmount] = useState("");
  const [month, setMonth] = useState(getCurrentMonth());

  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [savingCategory, setSavingCategory] = useState(false);

  // Listen for Settings updates
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

  // Currency formatter
  const formatMoney = (value) => {
    const currency = settings.currency || "INR";

    try {
      return new Intl.NumberFormat(
        currency === "INR" ? "en-IN" : "en-US",
        {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }
      ).format(Number(value || 0));
    } catch {
      return `₹${Number(value || 0).toLocaleString("en-IN")}`;
    }
  };

  const fetchBudgets = async () => {
    try {
      const response = await fetch(API, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setBudgets(data.budgets || []);
      } else {
        alert(data.message || "Failed to load budgets");
      }
    } catch (error) {
      console.error("Failed to load budgets:", error);
      alert("Unable to connect to the backend");
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch(TRANSACTION_API, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Failed to load transactions:", error);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(CATEGORY_API, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setCategories(
          (data.categories || []).filter(
            (item) => item.type === "expense"
          )
        );
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadData = async () => {
    setLoading(true);

    await Promise.all([
      fetchBudgets(),
      fetchTransactions(),
      fetchCategories(),
    ]);

    setLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const availableCategories = [
    ...DEFAULT_CATEGORIES,
    ...categories.map((item) => item.name),
  ].filter(
    (item, index, array) =>
      array.findIndex(
        (value) => value.toLowerCase() === item.toLowerCase()
      ) === index
  );

  const handleSaveCustomCategory = async () => {
    const name = customCategory.trim();

    if (!name) {
      alert("Please enter a category name");
      return;
    }

    const existingCategory = availableCategories.find(
      (item) => item.toLowerCase() === name.toLowerCase()
    );

    if (existingCategory) {
      setCategory(existingCategory);
      setCustomCategory("");
      setIsCustom(false);
      return;
    }

    setSavingCategory(true);

    try {
      const response = await fetch(CATEGORY_API, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name,
          type: "expense",
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setCategories((previous) => [
          ...previous,
          data.category,
        ]);

        setCategory(data.category.name);
        setCustomCategory("");
        setIsCustom(false);

        alert("Custom category saved successfully!");
      } else {
        alert(data.message || "Failed to save category");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to connect to the backend");
    } finally {
      setSavingCategory(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setCategory("");
    setCustomCategory("");
    setAmount("");
    setIsCustom(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const budgetData = {
      category: category.trim(),
      amount: Number(amount),
      month,
    };

    if (
      !budgetData.category ||
      budgetData.category === "__custom__" ||
      budgetData.amount <= 0
    ) {
      alert("Please select a category and enter a valid amount");
      return;
    }

    try {
      const response = await fetch(
        editingId ? `${API}/${editingId}` : API,
        {
          method: editingId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(budgetData),
        }
      );

      const data = await response.json();

      if (response.ok) {
        const wasEditing = Boolean(editingId);

        resetForm();
        await fetchBudgets();

        alert(
          wasEditing
            ? "Budget updated successfully!"
            : "Budget saved successfully!"
        );
      } else {
        alert(data.message || "Failed to save budget");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to connect to the backend");
    }
  };

  const handleEdit = (budget) => {
    setEditingId(budget._id);
    setCategory(budget.category);
    setAmount(String(budget.amount));
    setMonth(budget.month);
    setIsCustom(false);
    setCustomCategory("");

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this budget?")) {
      return;
    }

    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        if (editingId === id) {
          resetForm();
        }

        await fetchBudgets();
        alert("Budget deleted successfully!");
      } else {
        alert(data.message || "Failed to delete budget");
      }
    } catch (error) {
      console.error(error);
      alert("Unable to connect to the backend");
    }
  };

  const selectedBudgets = useMemo(
    () => budgets.filter((budget) => budget.month === month),
    [budgets, month]
  );

  const getSpent = (budget) => {
    const budgetCategory = budget.category.trim().toLowerCase();

    return transactions
      .filter((transaction) => {
        if (transaction.type !== "expense") return false;

        const transactionCategory = (
          transaction.category || ""
        ).trim().toLowerCase();

        const transactionMonth = transaction.date
          ? (() => {
              const dateString = String(transaction.date);
              const match = dateString.match(
                /^(\d{4})-(\d{2})/
              );

              if (match) {
                return `${match[1]}-${match[2]}`;
              }

              const parsed = new Date(transaction.date);

              if (Number.isNaN(parsed.getTime())) return "";

              return `${parsed.getFullYear()}-${String(
                parsed.getMonth() + 1
              ).padStart(2, "0")}`;
            })()
          : "";

        return (
          transactionCategory === budgetCategory &&
          transactionMonth === budget.month
        );
      })
      .reduce(
        (total, transaction) =>
          total + Number(transaction.amount || 0),
        0
      );
  };

  const totalBudget = selectedBudgets.reduce(
    (total, budget) => total + Number(budget.amount || 0),
    0
  );

  const totalSpent = selectedBudgets.reduce(
    (total, budget) => total + getSpent(budget),
    0
  );

  const totalRemaining = totalBudget - totalSpent;

  const overallPercentage =
    totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

  return (
    <div className="transactions-page budget-page">

      <div className="page-heading">
        <div>
          <h1>Budget Management</h1>
          <p>Plan your spending and stay in control of your money.</p>
        </div>

        <div className="transaction-count">
          {selectedBudgets.length} Active Budgets
        </div>
      </div>

      <div className="transaction-summary-grid">

        <div className="dashboard-card transaction-summary-card">
          <div className="summary-icon balance-icon">
            {settings.currency === "INR" ? "₹" : settings.currency}
          </div>
          <div>
            <p>Total Budget</p>
            <h2>{formatMoney(totalBudget)}</h2>
          </div>
        </div>

        <div className="dashboard-card transaction-summary-card">
          <div className="summary-icon expense-icon">↘</div>
          <div>
            <p>Total Spent</p>
            <h2>{formatMoney(totalSpent)}</h2>
          </div>
        </div>

        <div className="dashboard-card transaction-summary-card">
          <div className={`summary-icon ${totalRemaining < 0 ? "expense-icon" : "income-icon"}`}>
            {totalRemaining < 0 ? "!" : "✓"}
          </div>
          <div>
            <p>{totalRemaining < 0 ? "Over Budget" : "Remaining"}</p>
            <h2>{formatMoney(Math.abs(totalRemaining))}</h2>
          </div>
        </div>

      </div>

      <div className="dashboard-card overall-budget-card">
        <div className="transaction-section-heading">
          <div>
            <h2>Overall Budget Progress</h2>
            <p>
              Your spending against your total monthly budget.
              {" "}
              ({formatMonth(month, settings.dateFormat)})
            </p>
          </div>

          <strong className="budget-overall-percentage">
            {overallPercentage.toFixed(1)}%
          </strong>
        </div>

        <div className="budget-progress-track overall-progress-track">
          <div
            className={`budget-progress-fill ${
              overallPercentage >= 100
                ? "danger"
                : overallPercentage >= 80
                ? "warning"
                : "safe"
            }`}
            style={{
              width: `${Math.min(overallPercentage, 100)}%`,
            }}
          />
        </div>

        <div className="budget-overall-labels">
          <span>Spent: {formatMoney(totalSpent)}</span>
          <span>Budget: {formatMoney(totalBudget)}</span>
        </div>
      </div>

      <div className="dashboard-card transaction-form-card">

        <div className="transaction-section-heading">
          <div>
            <h2>{editingId ? "Edit Budget" : "Create New Budget"}</h2>
            <p>
              {editingId
                ? "Update your monthly spending limit."
                : "Set a spending limit for an expense category."}
            </p>
          </div>

          {editingId && (
            <span className="editing-label">Editing</span>
          )}
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>

          <div className="transaction-field">
            <label>Expense Category</label>

            <select
              value={isCustom ? "__custom__" : category}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setCategory("");
                  setIsCustom(true);
                  setCustomCategory("");
                } else {
                  setCategory(e.target.value);
                  setIsCustom(false);
                  setCustomCategory("");
                }
              }}
              required={!isCustom}
            >
              <option value="">Select Category</option>

              {availableCategories.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}

              <option value="__custom__">
                + Add Custom Category
              </option>
            </select>

            {isCustom && (
              <div className="custom-category-box">
                <input
                  type="text"
                  placeholder="Enter custom category"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />

                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={handleSaveCustomCategory}
                  disabled={savingCategory}
                >
                  {savingCategory ? "Saving..." : "Save Category"}
                </button>
              </div>
            )}
          </div>

          <div className="transaction-field">
            <label>Monthly Budget Limit ({settings.currency})</label>

            <input
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Enter budget amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          <div className="transaction-field">
            <label>Budget Month</label>

            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              required
            />
          </div>

          <div className="transaction-form-actions">
            <button type="submit" className="primary-action-button">
              {editingId ? "Update Budget" : "+ Save Budget"}
            </button>

            {editingId && (
              <button
                type="button"
                className="secondary-action-button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>

        </form>
      </div>

      <div className="dashboard-card transaction-history-card">

        <div className="transaction-section-heading">
          <div>
            <h2>Your Monthly Budgets</h2>
            <p>Track spending category by category.</p>
          </div>

          <div className="budget-month-selector">
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
            />
          </div>
        </div>

        {loading ? (
          <div className="transaction-empty-state">
            Loading your budgets...
          </div>
        ) : selectedBudgets.length === 0 ? (
          <div className="transaction-empty-state">
            <div className="empty-icon">₹</div>
            <h3>No budgets found</h3>
            <p>Create your first budget for this month.</p>
          </div>
        ) : (
          <div className="budget-cards-list">

            {selectedBudgets.map((budget) => {
              const spent = getSpent(budget);
              const limit = Number(budget.amount) || 0;
              const remaining = limit - spent;

              const percentage =
                limit > 0 ? (spent / limit) * 100 : 0;

              const barWidth = Math.min(percentage, 100);

              const status =
                percentage >= 100
                  ? "danger"
                  : percentage >= 80
                  ? "warning"
                  : "safe";

              return (
                <div className="budget-item-card" key={budget._id}>

                  <div className="budget-item-top">

                    <div className="budget-category-icon">
                      {budget.category.charAt(0).toUpperCase()}
                    </div>

                    <div className="budget-category-info">
                      <h3>{budget.category}</h3>
                      <span>
                        Monthly spending limit · {formatMonth(budget.month, settings.dateFormat)}
                      </span>
                    </div>

                    <div className="budget-limit-amount">
                      <strong>{formatMoney(limit)}</strong>
                      <span>Budget limit</span>
                    </div>

                  </div>

                  <div className="budget-spending-details">
                    <div>
                      <span>Spent</span>
                      <strong>{formatMoney(spent)}</strong>
                    </div>

                    <div>
                      <span>
                        {remaining >= 0 ? "Remaining" : "Over budget"}
                      </span>

                      <strong className={remaining < 0 ? "budget-danger-text" : "budget-safe-text"}>
                        {formatMoney(Math.abs(remaining))}
                      </strong>
                    </div>

                    <div>
                      <span>Used</span>
                      <strong>{percentage.toFixed(1)}%</strong>
                    </div>
                  </div>

                  <div className="budget-progress-track">
                    <div
                      className={`budget-progress-fill ${status}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>

                  {percentage >= 100 ? (
                    <div className="budget-status-message danger-message">
                      Budget limit exceeded. Review your spending.
                    </div>
                  ) : percentage >= 80 ? (
                    <div className="budget-status-message warning-message">
                      You are close to your budget limit.
                    </div>
                  ) : (
                    <div className="budget-status-message safe-message">
                      You are within your budget.
                    </div>
                  )}

                  <div className="budget-item-actions">
                    <button
                      type="button"
                      className="edit-transaction-button"
                      onClick={() => handleEdit(budget)}
                    >
                      Edit Budget
                    </button>

                    <button
                      type="button"
                      className="delete-button"
                      onClick={() => handleDelete(budget._id)}
                    >
                      Delete
                    </button>
                  </div>

                </div>
              );
            })}

          </div>
        )}

      </div>

    </div>
  );
}

export default Budget;
