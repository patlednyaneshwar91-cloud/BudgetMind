
import { useEffect, useMemo, useState } from "react";
import "./SavingsGoals.css";

const API = "http://localhost:5001/api/savings-goals";

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

function SavingsGoals() {
  const [settings, setSettings] = useState(getSavedSettings);

  const [goals, setGoals] = useState([]);
  const [name, setName] = useState("");
  const [targetAmount, setTargetAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [savingAmounts, setSavingAmounts] = useState({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("success");

  // Listen for Settings changes
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

  // Date formatter
  const formatDate = (value) => {
    if (!value) return "Not set";

    const dateString = String(value);

    const dateOnly = dateString.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    let day;
    let month;
    let year;

    if (dateOnly) {
      year = dateOnly[1];
      month = dateOnly[2];
      day = dateOnly[3];
    } else {
      const parsedDate = new Date(value);

      if (Number.isNaN(parsedDate.getTime())) {
        return "Not set";
      }

      day = String(parsedDate.getDate()).padStart(2, "0");
      month = String(parsedDate.getMonth() + 1).padStart(2, "0");
      year = String(parsedDate.getFullYear());
    }

    switch (settings.dateFormat) {
      case "MM/DD/YYYY":
        return `${month}/${day}/${year}`;

      case "YYYY-MM-DD":
        return `${year}-${month}-${day}`;

      case "DD/MM/YYYY":
      default:
        return `${day}/${month}/${year}`;
    }
  };

  const showMessage = (text, type = "success") => {
    setMessage(text);
    setMessageType(type);
  };

  const fetchGoals = async () => {
    try {
      const response = await fetch(API, {
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load savings goals.");
      }

      setGoals(data.goals || []);
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const summary = useMemo(() => {
    const totalSaved = goals.reduce(
      (sum, goal) => sum + Number(goal.savedAmount || 0),
      0
    );

    const totalTarget = goals.reduce(
      (sum, goal) => sum + Number(goal.targetAmount || 0),
      0
    );

    const completedGoals = goals.filter(
      (goal) =>
        Number(goal.savedAmount || 0) >=
        Number(goal.targetAmount || 0)
    ).length;

    return {
      totalSaved,
      totalTarget,
      remaining: Math.max(totalTarget - totalSaved, 0),
      completedGoals,
      activeGoals: goals.length - completedGoals,
      progress:
        totalTarget > 0
          ? Math.min((totalSaved / totalTarget) * 100, 100)
          : 0,
    };
  }, [goals]);

  const resetForm = () => {
    setName("");
    setTargetAmount("");
    setDeadline("");
    setDescription("");
    setEditingId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage("");

    if (
      !name.trim() ||
      !Number.isFinite(Number(targetAmount)) ||
      Number(targetAmount) <= 0
    ) {
      showMessage(
        "Enter a goal name and a valid target amount.",
        "error"
      );
      return;
    }

    try {
      setSubmitting(true);

      const url = editingId ? `${API}/${editingId}` : API;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          targetAmount: Number(targetAmount),
          deadline: deadline || null,
          description: description.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not save the goal.");
      }

      showMessage(
        editingId
          ? "Savings goal updated successfully!"
          : "Savings goal created successfully!"
      );

      resetForm();
      await fetchGoals();
    } catch (error) {
      showMessage(error.message, "error");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (goal) => {
    setEditingId(goal._id);
    setName(goal.name || "");
    setTargetAmount(goal.targetAmount || "");

    if (goal.deadline) {
      const parsedDate = new Date(goal.deadline);

      if (!Number.isNaN(parsedDate.getTime())) {
        const localDate = new Date(
          parsedDate.getTime() -
            parsedDate.getTimezoneOffset() * 60000
        );

        setDeadline(localDate.toISOString().slice(0, 10));
      } else {
        setDeadline("");
      }
    } else {
      setDeadline("");
    }

    setDescription(goal.description || "");

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this savings goal?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`${API}/${id}`, {
        method: "DELETE",
        credentials: "include",
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not delete the goal.");
      }

      showMessage("Savings goal deleted successfully!");
      await fetchGoals();
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  const handleAddSavings = async (id) => {
    const amount = Number(savingAmounts[id]);

    if (!Number.isFinite(amount) || amount <= 0) {
      showMessage("Enter a valid amount to add.", "error");
      return;
    }

    try {
      const response = await fetch(`${API}/${id}/add`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({ amount }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Could not add savings.");
      }

      setSavingAmounts((previous) => ({
        ...previous,
        [id]: "",
      }));

      showMessage("Money added to your savings goal!");
      await fetchGoals();
    } catch (error) {
      showMessage(error.message, "error");
    }
  };

  return (
    <div className="savings-goals-page">

      <div className="sg-page-heading">
        <div>
          <span className="sg-eyebrow">PLAN YOUR FUTURE</span>
          <h2>Savings Goals</h2>
          <p>Turn your financial dreams into achievable milestones.</p>
        </div>

        <div className="sg-heading-icon">✦</div>
      </div>

      {message && (
        <div
          className={`sg-message ${messageType}`}
          role="status"
        >
          <span>{messageType === "success" ? "✓" : "!"}</span>
          {message}

          <button
            type="button"
            onClick={() => setMessage("")}
            aria-label="Close message"
          >
            ×
          </button>
        </div>
      )}

      <div className="sg-summary-grid">

        <div className="sg-summary-card">
          <div className="sg-summary-top">
            <span>Total Saved</span>
            <span className="sg-summary-icon green">
              {settings.currency === "INR" ? "₹" : settings.currency}
            </span>
          </div>
          <h3>{formatMoney(summary.totalSaved)}</h3>
          <p>Your savings so far</p>
        </div>

        <div className="sg-summary-card">
          <div className="sg-summary-top">
            <span>Total Target</span>
            <span className="sg-summary-icon blue">◎</span>
          </div>
          <h3>{formatMoney(summary.totalTarget)}</h3>
          <p>Across all your goals</p>
        </div>

        <div className="sg-summary-card">
          <div className="sg-summary-top">
            <span>Remaining</span>
            <span className="sg-summary-icon orange">↗</span>
          </div>
          <h3>{formatMoney(summary.remaining)}</h3>
          <p>Amount left to save</p>
        </div>

        <div className="sg-summary-card">
          <div className="sg-summary-top">
            <span>Completed Goals</span>
            <span className="sg-summary-icon purple">✓</span>
          </div>
          <h3>{summary.completedGoals}</h3>
          <p>
            {summary.activeGoals} active{" "}
            {summary.activeGoals === 1 ? "goal" : "goals"}
          </p>
        </div>

      </div>

      <div className="sg-overview-card">
        <div className="sg-overview-heading">
          <div>
            <span className="sg-eyebrow">YOUR SAVINGS JOURNEY</span>
            <h3>Overall Progress</h3>
          </div>

          <strong>{summary.progress.toFixed(1)}%</strong>
        </div>

        <div className="sg-overview-track">
          <div
            className="sg-overview-fill"
            style={{ width: `${summary.progress}%` }}
          />
        </div>

        <div className="sg-overview-footer">
          <span>{formatMoney(summary.totalSaved)} saved</span>
          <span>{formatMoney(summary.totalTarget)} target</span>
        </div>
      </div>

      <div className="sg-form-card">
        <div className="sg-section-heading">
          <div>
            <span className="sg-eyebrow">
              {editingId ? "UPDATE YOUR PLAN" : "START SOMETHING GREAT"}
            </span>

            <h3>
              {editingId ? "Edit Savings Goal" : "Create a Savings Goal"}
            </h3>

            <p>Give your next financial milestone a name.</p>
          </div>

          <span className="sg-form-icon">＋</span>
        </div>

        <form className="sg-form" onSubmit={handleSubmit}>
          <div className="sg-form-grid">

            <div className="sg-field">
              <label htmlFor="sg-name">Goal Name</label>
              <input
                id="sg-name"
                type="text"
                placeholder="Example: Buy a Laptop"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="sg-field">
              <label htmlFor="sg-target">
                Target Amount ({settings.currency})
              </label>

              <input
                id="sg-target"
                type="number"
                min="1"
                placeholder="Example: 50000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                required
              />
            </div>

            <div className="sg-field">
              <label htmlFor="sg-deadline">Target Deadline</label>
              <input
                id="sg-deadline"
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
              />
            </div>

            <div className="sg-field">
              <label htmlFor="sg-description">Description</label>
              <input
                id="sg-description"
                type="text"
                placeholder="What are you saving for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

          </div>

          <div className="sg-form-actions">
            <button
              className="sg-primary-button"
              type="submit"
              disabled={submitting}
            >
              {submitting
                ? "Saving..."
                : editingId
                  ? "Update Goal"
                  : "Create Goal"}
            </button>

            {editingId && (
              <button
                className="sg-secondary-button"
                type="button"
                onClick={resetForm}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="sg-goals-heading">
        <div>
          <span className="sg-eyebrow">YOUR FINANCIAL MILESTONES</span>
          <h3>My Savings Goals</h3>
        </div>

        <span className="sg-goal-count">
          {goals.length} {goals.length === 1 ? "Goal" : "Goals"}
        </span>
      </div>

      {loading ? (
        <div className="sg-empty-state">
          <div className="sg-loader" />
          <p>Loading your savings goals...</p>
        </div>
      ) : goals.length === 0 ? (
        <div className="sg-empty-state">
          <div className="sg-empty-icon">◎</div>
          <h3>No savings goals yet</h3>
          <p>
            Create your first goal and start building your savings journey.
          </p>
        </div>
      ) : (
        <div className="sg-goals-grid">

          {goals.map((goal) => {
            const saved = Number(goal.savedAmount || 0);
            const target = Number(goal.targetAmount || 0);
            const remaining = Math.max(target - saved, 0);

            const progress =
              target > 0 ? Math.min((saved / target) * 100, 100) : 0;

            const completed = target > 0 && saved >= target;

            return (
              <div className="sg-goal-card" key={goal._id}>

                <div className="sg-goal-card-top">
                  <div className="sg-goal-icon">✦</div>

                  <span className={`sg-status ${completed ? "completed" : "active"}`}>
                    {completed ? "Completed" : "In Progress"}
                  </span>
                </div>

                <h3>{goal.name}</h3>

                {goal.description && (
                  <p className="sg-goal-description">
                    {goal.description}
                  </p>
                )}

                <div className="sg-goal-amounts">
                  <div>
                    <span>Saved Amount</span>
                    <strong>{formatMoney(saved)}</strong>
                  </div>

                  <div>
                    <span>Target Amount</span>
                    <strong>{formatMoney(target)}</strong>
                  </div>
                </div>

                <div className="sg-progress-heading">
                  <span>Goal progress</span>
                  <strong>{progress.toFixed(1)}%</strong>
                </div>

                <div
                  className="sg-goal-track"
                  role="progressbar"
                  aria-valuenow={Math.round(progress)}
                  aria-valuemin="0"
                  aria-valuemax="100"
                  aria-label={`${goal.name} progress`}
                >
                  <div
                    className="sg-goal-fill"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                <div className="sg-goal-remaining">
                  <span>Remaining to save</span>
                  <strong>{formatMoney(remaining)}</strong>
                </div>

                <div className="sg-deadline">
                  <span>◷</span>
                  Deadline: {formatDate(goal.deadline)}
                </div>

                {!completed ? (
                  <div className="sg-add-savings">
                    <input
                      type="number"
                      min="1"
                      placeholder={`Amount to add (${settings.currency})`}
                      value={savingAmounts[goal._id] || ""}
                      onChange={(e) =>
                        setSavingAmounts((previous) => ({
                          ...previous,
                          [goal._id]: e.target.value,
                        }))
                      }
                    />

                    <button
                      type="button"
                      onClick={() => handleAddSavings(goal._id)}
                    >
                      Add Savings
                    </button>
                  </div>
                ) : (
                  <div className="sg-completed-message">
                    🎉 Congratulations! Goal completed.
                  </div>
                )}

                <div className="sg-card-actions">
                  <button
                    type="button"
                    className="sg-edit-button"
                    onClick={() => handleEdit(goal)}
                  >
                    Edit Goal
                  </button>

                  <button
                    type="button"
                    className="sg-delete-button"
                    onClick={() => handleDelete(goal._id)}
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
  );
}

export default SavingsGoals;
