
import { useEffect, useMemo, useState } from "react";
import { jsPDF } from "jspdf";
import "./Analytics.css";

const API = "http://localhost:5001/api";

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

function getMonthKey(date) {
  return `${date.getFullYear()}-${String(
    date.getMonth() + 1
  ).padStart(2, "0")}`;
}

function getMonthDate(monthKey) {
  return new Date(`${monthKey}-01T12:00:00`);
}

function getMonthLabel(monthKey) {
  return getMonthDate(monthKey).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

function formatDate(value, dateFormat) {
  if (!value) return "";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "";

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

function getTransactionMonth(item) {
  if (!item.date) return null;

  const date = new Date(item.date);

  if (Number.isNaN(date.getTime())) return null;

  return getMonthKey(date);
}

function calculateTotals(transactions) {
  const income = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const expenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return {
    income,
    expenses,
    savings: income - expenses,
    savingsRate:
      income > 0 ? ((income - expenses) / income) * 100 : 0,
  };
}

function getComparison(current, previous) {
  const difference = current - previous;

  if (previous === 0) {
    return {
      difference,
      percentage: null,
      message: current === 0 ? "No change" : "No previous data",
    };
  }

  return {
    difference,
    percentage: (difference / previous) * 100,
    message: `${Math.abs(
      (difference / previous) * 100
    ).toFixed(1)}%`,
  };
}

function escapeCSVValue(value) {
  let text = String(value ?? "");

  if (/^[=+\-@]/.test(text)) {
    text = `'${text}`;
  }

  return `"${text.replace(/"/g, '""')}"`;
}

function Analytics() {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [settings, setSettings] = useState(getSavedSettings);

  const [selectedMonth, setSelectedMonth] = useState(
    getMonthKey(new Date())
  );

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

  // Currency formatter for the Analytics page
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

  // Currency formatter for PDF
  const formatPDFMoney = (value) => {
    const currency = settings.currency || "INR";

    try {
      return new Intl.NumberFormat(
        currency === "INR" ? "en-IN" : "en-US",
        {
          style: "currency",
          currency,
          currencyDisplay: "code",
          maximumFractionDigits: 2,
        }
      ).format(Number(value || 0));
    } catch {
      return `INR ${Number(value || 0).toLocaleString("en-IN")}`;
    }
  };

  // Fetch transactions
  const fetchTransactions = async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API}/transactions`, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || "Unable to load transactions.");
        return;
      }

      setTransactions(data.transactions || []);
    } catch (err) {
      console.error("Analytics loading failed:", err);
      setError("Unable to connect to the backend.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  // Calculate analytics
  const analytics = useMemo(() => {
    const selectedDate = getMonthDate(selectedMonth);

    const previousDate = new Date(
      selectedDate.getFullYear(),
      selectedDate.getMonth() - 1,
      1
    );

    const previousMonth = getMonthKey(previousDate);

    const currentTransactions = transactions.filter(
      (item) => getTransactionMonth(item) === selectedMonth
    );

    const previousTransactions = transactions.filter(
      (item) => getTransactionMonth(item) === previousMonth
    );

    const current = calculateTotals(currentTransactions);
    const previous = calculateTotals(previousTransactions);

    const categoryTotals = {};

    currentTransactions
      .filter((item) => item.type === "expense")
      .forEach((item) => {
        const name = (item.category || "Other").trim() || "Other";

        categoryTotals[name] =
          (categoryTotals[name] || 0) + Number(item.amount || 0);
      });

    const categories = Object.entries(categoryTotals)
      .map(([name, total]) => ({ name, total }))
      .sort((a, b) => b.total - a.total);

    const monthlyTotals = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(
        selectedDate.getFullYear(),
        selectedDate.getMonth() - 5 + index,
        1
      );

      const key = getMonthKey(date);

      const monthTransactions = transactions.filter(
        (item) => getTransactionMonth(item) === key
      );

      const totals = calculateTotals(monthTransactions);

      return {
        key,
        label: date.toLocaleDateString("en-IN", {
          month: "short",
        }),
        ...totals,
      };
    });

    return {
      ...current,
      previous,
      previousMonth,
      categories,
      monthlyTotals,
      incomeComparison: getComparison(
        current.income,
        previous.income
      ),
      expenseComparison: getComparison(
        current.expenses,
        previous.expenses
      ),
      savingsComparison: getComparison(
        current.savings,
        previous.savings
      ),
    };
  }, [transactions, selectedMonth]);

  const largestCategory = analytics.categories[0];

  const maxMonthlyValue = Math.max(
    1,
    ...analytics.monthlyTotals.flatMap((month) => [
      month.income,
      month.expenses,
    ])
  );

  const maxSavingsValue = Math.max(
    1,
    ...analytics.monthlyTotals.map((month) =>
      Math.abs(month.savings)
    )
  );

  const monthName = getMonthLabel(selectedMonth);

  // PDF export
  const downloadPDF = () => {
    try {
      const doc = new jsPDF();
      let y = 20;

      const addText = (text, size = 11, bold = false) => {
        doc.setFontSize(size);
        doc.setFont("helvetica", bold ? "bold" : "normal");

        const lines = doc.splitTextToSize(String(text), 170);

        if (y + lines.length * 7 > 275) {
          doc.addPage();
          y = 20;
        }

        doc.text(lines, 20, y);
        y += lines.length * 7 + 3;
      };

      addText("BUDGETMIND", 20, true);
      addText("Monthly Financial Report", 16, true);
      addText(`Report Month: ${monthName}`);
      addText(
        `Generated: ${formatDate(
          new Date(),
          settings.dateFormat
        )}`
      );
      addText(`Currency: ${settings.currency}`);

      y += 5;
      addText("FINANCIAL SUMMARY", 14, true);
      addText(`Monthly Income: ${formatPDFMoney(analytics.income)}`);
      addText(`Monthly Expenses: ${formatPDFMoney(analytics.expenses)}`);
      addText(`Net Savings: ${formatPDFMoney(analytics.savings)}`);
      addText(`Savings Rate: ${analytics.savingsRate.toFixed(1)}%`);

      y += 5;
      addText("PREVIOUS MONTH COMPARISON", 14, true);
      addText(
        `Previous Month: ${getMonthLabel(analytics.previousMonth)}`
      );
      addText(
        `Previous Income: ${formatPDFMoney(analytics.previous.income)}`
      );
      addText(
        `Previous Expenses: ${formatPDFMoney(analytics.previous.expenses)}`
      );
      addText(
        `Previous Net Savings: ${formatPDFMoney(
          analytics.previous.savings
        )}`
      );

      y += 5;
      addText("SPENDING BY CATEGORY", 14, true);

      if (analytics.categories.length === 0) {
        addText("No expenses recorded for this month.");
      } else {
        analytics.categories.forEach((item) => {
          const percentage =
            analytics.expenses > 0
              ? (item.total / analytics.expenses) * 100
              : 0;

          addText(
            `${item.name}: ${formatPDFMoney(
              item.total
            )} (${percentage.toFixed(1)}%)`
          );
        });
      }

      y += 5;
      addText("FINANCIAL REPORT SUMMARY", 14, true);

      if (analytics.savings > 0) {
        addText(
          `You saved ${formatPDFMoney(
            analytics.savings
          )} during ${monthName}.`
        );
      } else if (analytics.savings < 0) {
        addText(
          `Your expenses exceeded your income by ${formatPDFMoney(
            Math.abs(analytics.savings)
          )}.`
        );
      } else {
        addText("Your recorded income and expenses are equal.");
      }

      if (largestCategory) {
        addText(
          `Highest spending category: ${largestCategory.name} (${formatPDFMoney(
            largestCategory.total
          )}).`
        );
      }

      y += 5;
      addText("Thank you for using BudgetMind!");

      doc.save(`BudgetMind-Report-${selectedMonth}.pdf`);
    } catch (err) {
      console.error("PDF generation failed:", err);
      alert("Unable to generate PDF. Please try again.");
    }
  };

  // CSV export
  const downloadCSV = () => {
    try {
      const monthlyTransactions = transactions
        .filter(
          (item) => getTransactionMonth(item) === selectedMonth
        )
        .sort((a, b) => new Date(b.date) - new Date(a.date));

      if (monthlyTransactions.length === 0) {
        alert("No transactions available for this month.");
        return;
      }

      const headers = [
        "Date",
        "Type",
        "Category",
        "Amount",
        "Currency",
        "Payment Method",
        "Notes",
      ];

      const rows = monthlyTransactions.map((item) => [
        item.date
          ? formatDate(item.date, settings.dateFormat)
          : "",
        item.type || "",
        item.category || "Other",
        Number(item.amount || 0).toFixed(2),
        settings.currency,
        item.paymentMethod || "Other",
        item.notes || "",
      ]);

      const csvContent = [
        headers.map(escapeCSVValue).join(","),
        ...rows.map((row) =>
          row.map(escapeCSVValue).join(",")
        ),
      ].join("\r\n");

      const blob = new Blob(["\uFEFF" + csvContent], {
        type: "text/csv;charset=utf-8;",
      });

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");

      link.href = url;
      link.download = `BudgetMind-Transactions-${selectedMonth}.csv`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("CSV export failed:", err);
      alert("Unable to download CSV. Please try again.");
    }
  };

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="analytics-state-card">
          <div className="analytics-loader" />
          <h2>Preparing your financial report</h2>
          <p>
            Please wait while we analyse your transactions.
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics-page">
        <div className="analytics-state-card">
          <div className="analytics-state-icon">!</div>
          <h2>Unable to load Analytics</h2>
          <p>{error}</p>
          <button
            className="analytics-primary-btn"
            onClick={fetchTransactions}
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const comparisons = [
    {
      label: "Income",
      current: analytics.income,
      previous: analytics.previous.income,
      comparison: analytics.incomeComparison,
      goodWhenPositive: true,
    },
    {
      label: "Expenses",
      current: analytics.expenses,
      previous: analytics.previous.expenses,
      comparison: analytics.expenseComparison,
      goodWhenPositive: false,
    },
    {
      label: "Net Savings",
      current: analytics.savings,
      previous: analytics.previous.savings,
      comparison: analytics.savingsComparison,
      goodWhenPositive: true,
    },
  ];

  return (
    <div className="analytics-page">

      <div className="analytics-header">
        <div>
          <span className="analytics-eyebrow">
            FINANCIAL OVERVIEW
          </span>
          <h1>Analytics & Reports</h1>
          <p>
            Understand your spending, track your progress and make
            better financial decisions.
          </p>
        </div>

        <div className="analytics-header-icon">▥</div>
      </div>

      <section className="analytics-welcome">
        <div className="analytics-welcome-icon">✦</div>
        <div>
          <span>YOUR MONEY, YOUR PROGRESS</span>
          <h2>Your financial journey, in clear numbers.</h2>
          <p>
            Explore your monthly performance and discover where
            your money goes.
          </p>
        </div>
      </section>

      <section className="analytics-filter-card">
        <div>
          <span className="analytics-section-label">
            REPORT PERIOD
          </span>
          <h2>Monthly Financial Report</h2>
          <p>Choose a month to view your financial performance.</p>
        </div>

        <div className="analytics-filter-controls">
          <label htmlFor="report-month">Select month</label>
          <input
            id="report-month"
            type="month"
            value={selectedMonth}
            onChange={(event) =>
              setSelectedMonth(event.target.value)
            }
          />
        </div>

        <div className="analytics-export-row">
          <button
            className="analytics-pdf-btn"
            onClick={downloadPDF}
          >
            <span>↓</span> Download PDF
          </button>

          <button
            className="analytics-csv-btn"
            onClick={downloadCSV}
          >
            <span>↓</span> Download CSV
          </button>
        </div>
      </section>

      <div className="analytics-report-caption">
        Showing report for <strong>{monthName}</strong>
      </div>

      <section className="analytics-stats-grid">
        <div className="analytics-stat-card income">
          <div className="analytics-stat-top">
            <span>Monthly Income</span>
            <span className="analytics-stat-icon">↗</span>
          </div>
          <h2>{formatMoney(analytics.income)}</h2>
          <p>Money received this month</p>
        </div>

        <div className="analytics-stat-card expenses">
          <div className="analytics-stat-top">
            <span>Monthly Expenses</span>
            <span className="analytics-stat-icon">↘</span>
          </div>
          <h2>{formatMoney(analytics.expenses)}</h2>
          <p>Money spent this month</p>
        </div>

        <div className="analytics-stat-card savings">
          <div className="analytics-stat-top">
            <span>Net Savings</span>
            <span className="analytics-stat-icon">◈</span>
          </div>
          <h2>{formatMoney(analytics.savings)}</h2>
          <p>Income minus expenses</p>
        </div>

        <div className="analytics-stat-card rate">
          <div className="analytics-stat-top">
            <span>Savings Rate</span>
            <span className="analytics-stat-icon">%</span>
          </div>
          <h2>{analytics.savingsRate.toFixed(1)}%</h2>
          <p>Percentage of income remaining</p>
        </div>
      </section>

      {/* Previous Month Comparison */}
      <section className="analytics-card">
        <div className="analytics-card-heading">
          <div>
            <span className="analytics-section-label">
              MONTHLY PERFORMANCE
            </span>
            <h2>Previous Month Comparison</h2>
            <p>
              Comparing {monthName} with{" "}
              {getMonthLabel(analytics.previousMonth)}.
            </p>
          </div>
          <span className="analytics-heading-icon">⇄</span>
        </div>

        <div className="analytics-comparison-list">
          {comparisons.map((item) => {
            const increased = item.comparison.difference > 0;
            const decreased = item.comparison.difference < 0;

            const positive =
              (increased && item.goodWhenPositive) ||
              (decreased && !item.goodWhenPositive);

            const negative =
              (increased && !item.goodWhenPositive) ||
              (decreased && item.goodWhenPositive);

            let comparisonText = "No change";

            if (item.previous === 0 && item.current !== 0) {
              comparisonText = "New activity — No previous data";
            } else if (increased) {
              comparisonText = `↑ Increased ${item.comparison.message}`;
            } else if (decreased) {
              comparisonText = `↓ Decreased ${item.comparison.message}`;
            }

            return (
              <div
                className="analytics-comparison-row"
                key={item.label}
              >
                <div>
                  <strong>{item.label}</strong>
                  <span>
                    Previous: {formatMoney(item.previous)}
                  </span>
                </div>

                <div className="analytics-comparison-current">
                  <strong>{formatMoney(item.current)}</strong>
                  <span
                    className={
                      positive
                        ? "comparison-positive"
                        : negative
                          ? "comparison-negative"
                          : "comparison-neutral"
                    }
                  >
                    {comparisonText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Highest Spending Category */}
      <section className="analytics-card analytics-highest-card">
        <div className="analytics-card-heading">
          <div>
            <span className="analytics-section-label">
              SPENDING INSIGHT
            </span>
            <h2>Highest Spending Category</h2>
            <p>Your biggest expense category for {monthName}.</p>
          </div>
          <span className="analytics-heading-icon">⌁</span>
        </div>

        {largestCategory ? (
          <div className="analytics-highest-content">
            <div className="analytics-highest-symbol">
              {settings.currency === "INR"
                ? "₹"
                : settings.currency}
            </div>
            <div>
              <h3>{largestCategory.name}</h3>
              <strong>
                {formatMoney(largestCategory.total)}
              </strong>
              <p>
                {analytics.expenses > 0
                  ? (
                      (largestCategory.total /
                        analytics.expenses) *
                      100
                    ).toFixed(1)
                  : "0.0"}
                % of your monthly expenses
              </p>
            </div>
          </div>
        ) : (
          <div className="analytics-empty">
            <span>◎</span>
            <p>No expenses recorded for this month yet.</p>
          </div>
        )}
      </section>

      {/* Monthly Income vs Expenses */}
      <section className="analytics-card">
        <div className="analytics-card-heading">
          <div>
            <span className="analytics-section-label">
              SIX-MONTH OVERVIEW
            </span>
            <h2>Monthly Income vs Expenses</h2>
            <p>
              Last 6 months ending with your selected month.
            </p>
          </div>
          <span className="analytics-heading-icon">▥</span>
        </div>

        <div className="analytics-chart">
          {analytics.monthlyTotals.map((item) => (
            <div
              className="analytics-chart-column"
              key={item.key}
            >
              <div className="analytics-bar-pair">
                <div
                  className="analytics-bar income-bar"
                  title={`Income: ${formatMoney(item.income)}`}
                  style={{
                    height: `${
                      (item.income / maxMonthlyValue) * 100
                    }%`,
                    minHeight: item.income > 0 ? "4px" : "0",
                  }}
                />

                <div
                  className="analytics-bar expense-bar"
                  title={`Expenses: ${formatMoney(item.expenses)}`}
                  style={{
                    height: `${
                      (item.expenses / maxMonthlyValue) * 100
                    }%`,
                    minHeight: item.expenses > 0 ? "4px" : "0",
                  }}
                />
              </div>
              <span className="analytics-chart-month">
                {item.label}
              </span>
            </div>
          ))}
        </div>

        <div className="analytics-legend">
          <span><i className="legend-income" /> Income</span>
          <span><i className="legend-expense" /> Expenses</span>
        </div>
      </section>

      {/* Monthly Savings Trend */}
      <section className="analytics-card">
        <div className="analytics-card-heading">
          <div>
            <span className="analytics-section-label">
              SAVINGS PERFORMANCE
            </span>
            <h2>Monthly Savings Trend</h2>
            <p>
              Your savings or deficit over the last 6 months.
            </p>
          </div>
          <span className="analytics-heading-icon">↗</span>
        </div>

        <div className="analytics-chart savings-chart">
          {analytics.monthlyTotals.map((item) => {
            const isPositive = item.savings >= 0;
            const height =
              (Math.abs(item.savings) / maxSavingsValue) * 100;

            return (
              <div
                className="analytics-chart-column"
                key={item.key}
              >
                <div className="analytics-savings-bar-area">
                  <div
                    className={`analytics-savings-bar ${
                      isPositive
                        ? "positive-bar"
                        : "negative-bar"
                    }`}
                    title={`Savings: ${formatMoney(item.savings)}`}
                    style={{
                      height: `${height}%`,
                      minHeight: item.savings !== 0 ? "4px" : "0",
                    }}
                  />
                </div>
                <span className="analytics-chart-month">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>

        <div className="analytics-legend">
          <span><i className="legend-income" /> Positive savings</span>
          <span><i className="legend-expense" /> Negative savings</span>
        </div>
      </section>

      {/* Spending by Category */}
      <section className="analytics-card">
        <div className="analytics-card-heading">
          <div>
            <span className="analytics-section-label">
              EXPENSE BREAKDOWN
            </span>
            <h2>Spending by Category</h2>
            <p>Where your money went in {monthName}.</p>
          </div>
          <span className="analytics-heading-icon">◉</span>
        </div>

        {analytics.categories.length === 0 ? (
          <div className="analytics-empty">
            <span>◎</span>
            <p>No expenses recorded this month.</p>
          </div>
        ) : (
          <div className="analytics-category-list">
            {analytics.categories.map((item) => {
              const percentage =
                analytics.expenses > 0
                  ? (item.total / analytics.expenses) * 100
                  : 0;

              return (
                <div
                  className="analytics-category-item"
                  key={item.name}
                >
                  <div className="analytics-category-heading">
                    <strong>{item.name}</strong>
                    <strong>{formatMoney(item.total)}</strong>
                  </div>

                  <div className="analytics-progress-track">
                    <div
                      className="analytics-progress-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>

                  <span className="analytics-category-percentage">
                    {percentage.toFixed(1)}% of expenses
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Financial Summary */}
      <section className="analytics-summary-card">
        <div className="analytics-card-heading">
          <div>
            <span className="analytics-section-label">
              YOUR MONTH AT A GLANCE
            </span>
            <h2>Financial Summary Report</h2>
            <p>
              A simple overview of your financial progress.
            </p>
          </div>
          <span className="analytics-heading-icon">✦</span>
        </div>

        <p className="analytics-summary-text">
          Your total income in {monthName} is{" "}
          <strong>{formatMoney(analytics.income)}</strong> and your
          total expenses are{" "}
          <strong>{formatMoney(analytics.expenses)}</strong>.
        </p>

        {analytics.savings > 0 ? (
          <div className="analytics-summary-message positive-summary">
            <span>✓</span>
            <p>
              Great! You have saved{" "}
              <strong>{formatMoney(analytics.savings)}</strong>{" "}
              this month.
            </p>
          </div>
        ) : analytics.savings < 0 ? (
          <div className="analytics-summary-message negative-summary">
            <span>!</span>
            <p>
              Your expenses exceed your income by{" "}
              <strong>
                {formatMoney(Math.abs(analytics.savings))}
              </strong>.
            </p>
          </div>
        ) : (
          <div className="analytics-summary-message neutral-summary">
            <span>i</span>
            <p>
              Your recorded income and expenses are equal.
            </p>
          </div>
        )}

        {largestCategory && (
          <p className="analytics-summary-text">
            Your highest spending is in{" "}
            <strong>{largestCategory.name}</strong>, with{" "}
            <strong>
              {formatMoney(largestCategory.total)}
            </strong>.
          </p>
        )}

        {analytics.income === 0 && (
          <p className="analytics-summary-note">
            Add an income transaction to calculate your savings rate.
          </p>
        )}
      </section>
    </div>
  );
}

export default Analytics;
