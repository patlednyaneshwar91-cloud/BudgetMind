
import { useEffect, useMemo, useState } from "react";

const API_URL = "http://localhost:5001/api";

const DEFAULT_SETTINGS = {
  currency: "INR",
  dateFormat: "DD/MM/YYYY",
};

const defaultCategories = {
  expense: [
    "Food", "Travel", "Shopping", "Entertainment",
    "Bills", "Health", "Education", "Rent",
    "Groceries", "Other",
  ],
  income: [
    "Salary", "Freelance", "Business",
    "Investment", "Gift", "Other",
  ],
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

function Transactions() {
  const [settings, setSettings] = useState(getSavedSettings);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("");
  const [type, setType] = useState("expense");
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [notes, setNotes] = useState("");
  const [date, setDate] = useState("");

  const [transactions, setTransactions] = useState([]);
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);

  const [isCustom, setIsCustom] = useState(false);
  const [customCategory, setCustomCategory] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");

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

  // Date formatter
  const formatDate = (value) => {
    if (!value) return "Date not available";

    const dateString = String(value);
    let day;
    let month;
    let year;

    // Handle date-only values without timezone shifting
    const dateOnly = dateString.match(
      /^(\d{4})-(\d{2})-(\d{2})$/
    );

    if (dateOnly) {
      year = dateOnly[1];
      month = dateOnly[2];
      day = dateOnly[3];
    } else {
      const parsedDate = new Date(value);

      if (Number.isNaN(parsedDate.getTime())) {
        return "Date not available";
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

  const fetchTransactions = async () => {
    try {
      const response = await fetch(`${API_URL}/transactions`, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setTransactions(data.transactions || []);
      } else {
        alert(data.message || "Unable to load transactions");
      }
    } catch (error) {
      console.error("Transaction error:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/categories`, {
        credentials: "include",
      });

      const data = await response.json();

      if (response.ok) {
        setCategories(data.categories || []);
      } else {
        console.error(data.message);
      }
    } catch (error) {
      console.error("Category error:", error);
    }
  };

  useEffect(() => {
    fetchTransactions();
    fetchCategories();
  }, []);

  const availableCategories = [
    ...defaultCategories[type],
    ...categories
      .filter((item) => item.type === type)
      .map((item) => item.name),
    ...(category &&
    !defaultCategories[type].includes(category) &&
    !categories.some(
      (item) => item.name === category && item.type === type
    )
      ? [category]
      : []),
  ].filter(
    (item, index, array) =>
      array.findIndex(
        (value) => value.toLowerCase() === item.toLowerCase()
      ) === index
  );

  const handleSaveCategory = async () => {
    const name = customCategory.trim();

    if (!name) {
      alert("Please enter a category name");
      return;
    }

    if (
      availableCategories.some(
        (item) => item.toLowerCase() === name.toLowerCase()
      )
    ) {
      alert("This category already exists");
      return;
    }

    setSavingCategory(true);

    try {
      const response = await fetch(`${API_URL}/categories`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ name, type }),
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
        alert(data.message || "Unable to save category");
      }
    } catch (error) {
      alert("Unable to connect to server");
      console.error(error);
    } finally {
      setSavingCategory(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setAmount("");
    setCategory("");
    setType("expense");
    setPaymentMethod("UPI");
    setNotes("");
    setDate("");
    setIsCustom(false);
    setCustomCategory("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!category.trim()) {
      alert("Please select a category");
      return;
    }

    if (!amount || Number(amount) <= 0) {
      alert("Please enter a valid amount");
      return;
    }

    try {
      const url = editingId
        ? `${API_URL}/transactions/${editingId}`
        : `${API_URL}/transactions`;

      const response = await fetch(url, {
        method: editingId ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          amount,
          category,
          type,
          paymentMethod,
          notes,
          date,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert(
          editingId
            ? "Transaction updated successfully!"
            : "Transaction added successfully!"
        );

        resetForm();
        fetchTransactions();
      } else {
        alert(data.message || "Unable to save transaction");
      }
    } catch (error) {
      alert("Unable to connect to server");
      console.error(error);
    }
  };

  const handleEdit = (transaction) => {
    setEditingId(transaction._id);
    setAmount(transaction.amount);
    setCategory(transaction.category);
    setType(transaction.type);
    setPaymentMethod(transaction.paymentMethod);
    setNotes(transaction.notes || "");
    setIsCustom(false);
    setCustomCategory("");

    if (transaction.date) {
      const transactionDate = new Date(transaction.date);

      const localDate = new Date(
        transactionDate.getTime() -
          transactionDate.getTimezoneOffset() * 60000
      );

      setDate(localDate.toISOString().split("T")[0]);
    } else {
      setDate("");
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this transaction?"
      )
    ) {
      return;
    }

    try {
      const response = await fetch(
        `${API_URL}/transactions/${id}`,
        {
          method: "DELETE",
          credentials: "include",
        }
      );

      const data = await response.json();

      if (response.ok) {
        alert("Transaction deleted successfully!");
        fetchTransactions();
      } else {
        alert(data.message || "Unable to delete transaction");
      }
    } catch (error) {
      alert("Unable to connect to server");
      console.error(error);
    }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter((transaction) => {
      const matchesFilter =
        filter === "all" || transaction.type === filter;

      const searchText = search.toLowerCase();

      const matchesSearch = [
        transaction.category,
        transaction.paymentMethod,
        transaction.notes,
      ]
        .join(" ")
        .toLowerCase()
        .includes(searchText);

      return matchesFilter && matchesSearch;
    });
  }, [transactions, filter, search]);

  const totalIncome = transactions
    .filter((item) => item.type === "income")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const totalExpenses = transactions
    .filter((item) => item.type === "expense")
    .reduce((sum, item) => sum + Number(item.amount || 0), 0);

  return (
    <div className="transactions-page">

      <div className="page-heading">
        <div>
          <h1>Transactions</h1>
          <p>Manage and track all your income and expenses.</p>
        </div>

        <div className="transaction-count">
          {transactions.length} Transactions
        </div>
      </div>

      <div className="transaction-summary-grid">

        <div className="dashboard-card transaction-summary-card">
          <div className="summary-icon income-icon">↗</div>
          <div>
            <p>Total Income</p>
            <h2>{formatMoney(totalIncome)}</h2>
          </div>
        </div>

        <div className="dashboard-card transaction-summary-card">
          <div className="summary-icon expense-icon">↘</div>
          <div>
            <p>Total Expenses</p>
            <h2>{formatMoney(totalExpenses)}</h2>
          </div>
        </div>

        <div className="dashboard-card transaction-summary-card">
          <div className="summary-icon balance-icon">₹</div>
          <div>
            <p>Net Balance</p>
            <h2>{formatMoney(totalIncome - totalExpenses)}</h2>
          </div>
        </div>

      </div>

      <div className="dashboard-card transaction-form-card">

        <div className="transaction-section-heading">
          <div>
            <h2>{editingId ? "Edit Transaction" : "Add New Transaction"}</h2>
            <p>
              {editingId
                ? "Update your transaction details below."
                : "Enter the details of your income or expense."}
            </p>
          </div>

          {editingId && (
            <span className="editing-label">Editing</span>
          )}
        </div>

        <form className="transaction-form" onSubmit={handleSubmit}>

          <div className="transaction-field">
            <label>Amount ({settings.currency})</label>
            <input
              type="number"
              placeholder="Enter amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              min="0.01"
              step="0.01"
              required
            />
          </div>

          <div className="transaction-field">
            <label>Transaction Type</label>
            <select
              value={type}
              onChange={(e) => {
                setType(e.target.value);
                setCategory("");
                setIsCustom(false);
                setCustomCategory("");
              }}
            >
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
          </div>

          <div className="transaction-field">
            <label>Category</label>
            <select
              value={isCustom ? "__custom__" : category}
              onChange={(e) => {
                if (e.target.value === "__custom__") {
                  setCategory("");
                  setIsCustom(true);
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
                  placeholder="Enter category name"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                />

                <button
                  type="button"
                  className="secondary-action-button"
                  onClick={handleSaveCategory}
                  disabled={savingCategory}
                >
                  {savingCategory ? "Saving..." : "Save Category"}
                </button>
              </div>
            )}
          </div>

          <div className="transaction-field">
            <label>Payment Method</label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
            >
              <option value="UPI">UPI</option>
              <option value="Cash">Cash</option>
              <option value="Card">Card</option>
              <option value="Bank Transfer">Bank Transfer</option>
              <option value="Other">Other</option>
            </select>
          </div>

          <div className="transaction-field">
            <label>Date</label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div className="transaction-field">
            <label>Notes</label>
            <input
              type="text"
              placeholder="Add a note (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          <div className="transaction-form-actions">
            <button type="submit" className="primary-action-button">
              {editingId ? "Update Transaction" : "+ Add Transaction"}
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
            <h2>Transaction History</h2>
            <p>View, search, edit and manage your transactions.</p>
          </div>
        </div>

        <div className="transaction-toolbar">

          <input
            className="transaction-search"
            type="search"
            placeholder="Search category, payment method or notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />

          <div className="transaction-filters">
            {["all", "income", "expense"].map((item) => (
              <button
                type="button"
                key={item}
                className={`filter-button ${filter === item ? "active" : ""}`}
                onClick={() => setFilter(item)}
              >
                {item === "all"
                  ? "All"
                  : item.charAt(0).toUpperCase() + item.slice(1)}
              </button>
            ))}
          </div>

        </div>

        {loading ? (
          <div className="transaction-empty-state">
            Loading transactions...
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="transaction-empty-state">
            <div className="empty-icon">↗</div>
            <h3>No transactions found</h3>
            <p>Try changing your search or add a new transaction.</p>
          </div>
        ) : (
          <div className="transactions-list">

            {filteredTransactions.map((transaction) => (
              <div className="transaction" key={transaction._id}>

                <div
                  className={`transaction-icon ${
                    transaction.type === "income"
                      ? "income-icon"
                      : "expense-icon"
                  }`}
                >
                  {transaction.type === "income" ? "↗" : "↘"}
                </div>

                <div className="transaction-info">
                  <strong>{transaction.category}</strong>

                  <span>
                    {transaction.paymentMethod || "Other"}
                    {" · "}
                    {formatDate(transaction.date)}
                  </span>

                  {transaction.notes && (
                    <small>{transaction.notes}</small>
                  )}
                </div>

                <div
                  className={`transaction-amount ${transaction.type}`}
                >
                  {transaction.type === "income" ? "+" : "-"}
                  {formatMoney(transaction.amount)}
                </div>

                <div className="transaction-actions">
                  <button
                    type="button"
                    className="edit-transaction-button"
                    onClick={() => handleEdit(transaction)}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    className="delete-button"
                    onClick={() => handleDelete(transaction._id)}
                  >
                    Delete
                  </button>
                </div>

              </div>
            ))}

          </div>
        )}

        <div className="transaction-results-count">
          Showing {filteredTransactions.length} of {transactions.length} transactions
        </div>

      </div>

    </div>
  );
}

export default Transactions;
