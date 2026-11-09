
import { useEffect, useState } from "react";
import "./AIInsights.css";

const API_URL = "http://localhost:5001/api/ai";

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

function AIInsights() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const [settings, setSettings] = useState(getSavedSettings);

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
  const formatMoney = (amount) => {
    const currency = settings.currency || "INR";

    try {
      return new Intl.NumberFormat(
        currency === "INR" ? "en-IN" : "en-US",
        {
          style: "currency",
          currency,
          maximumFractionDigits: 2,
        }
      ).format(Number(amount || 0));
    } catch {
      return `₹${Number(amount || 0).toLocaleString("en-IN")}`;
    }
  };

  // Fetch AI insights
  useEffect(() => {
    let cancelled = false;

    const fetchInsights = async () => {
      setLoading(true);
      setError("");

      try {
        const response = await fetch(API_URL, {
          credentials: "include",
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(
            result.message || "Could not load insights."
          );
        }

        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Backend connection failed."
          );
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    fetchInsights();

    return () => {
      cancelled = true;
    };
  }, [retry]);

  if (loading) {
    return (
      <div className="page-content ai-insights-page">
        <div className="ai-loading-card">
          <div className="ai-loader" />
          <h3>Analyzing your finances</h3>
          <p>Your financial insights are being prepared...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page-content ai-insights-page">
        <div className="ai-error-card">
          <div className="ai-error-icon">!</div>
          <h2>Unable to load insights</h2>
          <p>{error}</p>
          <button onClick={() => setRetry((value) => value + 1)}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const budgets = Array.isArray(data.budgetAnalysis)
    ? data.budgetAnalysis
    : [];

  const overspending = Array.isArray(data.overspending)
    ? data.overspending
    : [];

  const unusualExpenses = Array.isArray(data.unusualExpenses)
    ? data.unusualExpenses
    : [];

  const recommendations = Array.isArray(data.recommendations)
    ? data.recommendations
    : [];

  const insights = Array.isArray(data.insights)
    ? data.insights
    : [];

  const healthScore = Math.min(
    100,
    Math.max(0, Number(data.healthScore || 0))
  );

  const healthLabel =
    healthScore >= 80
      ? "Excellent"
      : healthScore >= 60
        ? "Good"
        : healthScore >= 40
          ? "Needs improvement"
          : "Needs attention";

  const healthColor =
    healthScore >= 80
      ? "excellent"
      : healthScore >= 60
        ? "good"
        : healthScore >= 40
          ? "average"
          : "low";

  const savingsRate = Number(data.savingsRate || 0);
  const highestCategory = data.highestCategory;

  return (
    <div className="page-content ai-insights-page">

      {/* Header */}
      <header className="ai-page-header">
        <div>
          <span className="ai-eyebrow">
            INTELLIGENT FINANCIAL ANALYSIS
          </span>
          <h1>AI Financial Insights</h1>
          <p>
            Understand your money better with personalized financial analysis.
          </p>
        </div>

        <div className="ai-header-icon">
          <span>✦</span>
        </div>
      </header>

      {/* AI Banner */}
      <section className="ai-welcome-banner">
        <div className="ai-banner-icon">✦</div>

        <div>
          <span>YOUR PERSONAL FINANCIAL ASSISTANT</span>
          <h2>Your money, your progress, your future.</h2>
          <p>
            Here is your financial overview for{" "}
            <strong>{data.month || "this month"}</strong>.
          </p>
        </div>
      </section>

      {/* Financial Summary */}
      <section className="ai-stats-grid">

        <article className="ai-stat-card income-stat">
          <div className="ai-stat-top">
            <span>Total Income</span>
            <span className="ai-stat-icon">↗</span>
          </div>
          <h2>{formatMoney(data.income)}</h2>
          <p>Your recorded income</p>
        </article>

        <article className="ai-stat-card expense-stat">
          <div className="ai-stat-top">
            <span>Total Expenses</span>
            <span className="ai-stat-icon">↘</span>
          </div>
          <h2>{formatMoney(data.expenses)}</h2>
          <p>Your recorded spending</p>
        </article>

        <article className="ai-stat-card savings-stat">
          <div className="ai-stat-top">
            <span>Net Savings</span>
            <span className="ai-stat-icon">
              {settings.currency === "INR"
                ? "₹"
                : settings.currency}
            </span>
          </div>
          <h2>{formatMoney(data.savings)}</h2>
          <p>Income minus expenses</p>
        </article>

      </section>

      {/* Financial Health */}
      <section className="ai-extra-card ai-health-card">
        <div className="ai-section-heading">
          <div>
            <span className="ai-eyebrow">
              FINANCIAL WELLNESS
            </span>
            <h2>Financial Health Score</h2>
            <p>A snapshot of your current financial position.</p>
          </div>
          <span className="ai-section-icon">♥</span>
        </div>

        <div className="ai-health-layout">
          <div className={`ai-health-score ${healthColor}`}>
            <strong>{healthScore}</strong>
            <span>OUT OF 100</span>
            <div className="ai-health-label">{healthLabel}</div>
          </div>

          <div className="ai-health-details">
            <div className="ai-health-bar-heading">
              <span>Overall financial health</span>
              <strong>{healthScore}%</strong>
            </div>

            <div className="ai-progress-track">
              <div
                className={`ai-progress-fill ${healthColor}`}
                style={{ width: `${healthScore}%` }}
              />
            </div>

            <div className="ai-metric-grid">
              <div>
                <span>Savings Rate</span>
                <strong>{savingsRate}%</strong>
              </div>

              <div>
                <span>Highest Spending</span>
                <strong>
                  {highestCategory?.category || "No spending"}
                </strong>
              </div>

              <div>
                <span>Category Amount</span>
                <strong>
                  {formatMoney(highestCategory?.amount)}
                </strong>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Budget Analysis */}
      <section className="ai-extra-card">
        <div className="ai-section-heading">
          <div>
            <span className="ai-eyebrow">BUDGET TRACKER</span>
            <h2>Monthly Budget Analysis</h2>
            <p>See how much of each budget you have used.</p>
          </div>
          <span className="ai-section-icon">▤</span>
        </div>

        {budgets.length > 0 ? (
          <div className="ai-budget-list">
            {budgets.map((budget, index) => {
              const percent = Math.min(
                100,
                Math.max(0, Number(budget.percentUsed || 0))
              );

              return (
                <div
                  className="ai-budget-item"
                  key={`${budget.category}-${index}`}
                >
                  <div className="ai-budget-heading">
                    <strong>{budget.category}</strong>
                    <span>
                      {formatMoney(budget.spent)} /{" "}
                      {formatMoney(budget.limit)}
                    </span>
                  </div>

                  <div className="ai-progress-track">
                    <div
                      className={`ai-progress-fill ${
                        budget.exceeded
                          ? "danger"
                          : percent >= 80
                            ? "warning"
                            : ""
                      }`}
                      style={{ width: `${percent}%` }}
                    />
                  </div>

                  <div className="ai-budget-footer">
                    <span>
                      {budget.exceeded
                        ? `Over budget by ${formatMoney(
                            Math.abs(budget.remaining)
                          )}`
                        : `${formatMoney(budget.remaining)} remaining`}
                    </span>
                    <strong>
                      {budget.percentUsed || 0}% used
                    </strong>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="ai-empty-message">
            <span>◎</span>
            <p>
              No monthly budgets found. Create a budget to start tracking your
              spending.
            </p>
          </div>
        )}
      </section>

      {/* Spending Alerts */}
      <section className="ai-extra-card">
        <div className="ai-section-heading">
          <div>
            <span className="ai-eyebrow">SPENDING CONTROL</span>
            <h2>Overspending Alerts</h2>
            <p>
              Categories where spending has crossed the budget limit.
            </p>
          </div>
          <span className="ai-section-icon">⚑</span>
        </div>

        {overspending.length > 0 ? (
          <div className="ai-alert-list">
            {overspending.map((item, index) => (
              <div
                className="ai-alert-item"
                key={`${item.category}-${index}`}
              >
                <div className="ai-alert-icon">!</div>
                <div>
                  <strong>{item.category}</strong>
                  <p>
                    You exceeded your budget by{" "}
                    <strong>
                      {formatMoney(item.spent - item.limit)}
                    </strong>
                    .
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-success-message">
            <span>✓</span>
            <div>
              <strong>Great job!</strong>
              <p>No budget overspending detected.</p>
            </div>
          </div>
        )}
      </section>

      {/* Unusual Expenses */}
      <section className="ai-extra-card">
        <div className="ai-section-heading">
          <div>
            <span className="ai-eyebrow">SMART DETECTION</span>
            <h2>Unusual Expense Detection</h2>
            <p>
              Review expenses that stand out in your spending history.
            </p>
          </div>
          <span className="ai-section-icon">⌕</span>
        </div>

        {unusualExpenses.length > 0 ? (
          <div className="ai-alert-list">
            {unusualExpenses.map((item, index) => (
              <div
                className="ai-alert-item unusual"
                key={`${item.category}-${index}`}
              >
                <div className="ai-alert-icon">!</div>
                <div>
                  <strong>
                    {item.category} — {formatMoney(item.amount)}
                  </strong>
                  <p>{item.message}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="ai-empty-message">
            <span>✓</span>
            <p>
              No unusually large expenses detected using your available
              spending history.
            </p>
          </div>
        )}
      </section>

      {/* AI Recommendations */}
      <section className="ai-suggestions-card">
        <div className="ai-suggestions-header">
          <div>
            <span className="ai-eyebrow">SMART MONEY TIPS</span>
            <h2>Your Financial Insights</h2>
            <p>
              Suggestions based on your recorded transactions.
            </p>
          </div>
          <span className="ai-sparkle">✦</span>
        </div>

        {insights.length > 0 ? (
          <div className="ai-suggestions-list">
            {insights.map((item, index) => (
              <article
                className="ai-suggestion-item"
                key={index}
              >
                <span className="ai-bulb">✦</span>
                <div>
                  <span className="ai-tip-number">
                    INSIGHT {String(index + 1).padStart(2, "0")}
                  </span>
                  <p>{item}</p>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="ai-no-tips">
            More insights will appear as you add financial transactions.
          </p>
        )}

        <div className="ai-recommendation-heading">
          <span className="ai-eyebrow">YOUR NEXT STEPS</span>
          <h2>Personalized Recommendations</h2>
        </div>

        {recommendations.length > 0 ? (
          <div className="ai-recommendations-list">
            {recommendations.map((item, index) => (
              <article
                className="ai-recommendation-item"
                key={index}
              >
                <span>✓</span>
                <p>{item}</p>
              </article>
            ))}
          </div>
        ) : (
          <p className="ai-no-tips">
            No additional recommendations right now.
          </p>
        )}

        <div className="ai-disclaimer">
          <span>ⓘ</span>
          These insights are generated from your recorded financial data.
          Review your transactions regularly for better results.
        </div>
      </section>
    </div>
  );
}

export default AIInsights;
