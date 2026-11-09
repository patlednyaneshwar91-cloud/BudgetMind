
const Transaction = require("../models/Transaction");
const Budget = require("../models/Budget");

const getAIInsights = async (req, res) => {
  try {
    const userId = req.user.userId;
    const now = new Date();

    const year = now.getFullYear();
    const monthNumber = String(now.getMonth() + 1).padStart(2, "0");
    const monthKey = `${year}-${monthNumber}`;

    const startOfMonth = new Date(year, now.getMonth(), 1);
    const endOfMonth = new Date(year, now.getMonth() + 1, 1);
    const historyStart = new Date(year, now.getMonth() - 3, 1);

    const [transactions, budgets] = await Promise.all([
      Transaction.find({ user: userId }).sort({ date: -1 }),
      Budget.find({ user: userId, month: monthKey }),
    ]);

    const monthTransactions = transactions.filter((t) => {
      const date = new Date(t.date);
      return date >= startOfMonth && date < endOfMonth;
    });

    const expensesList = monthTransactions.filter(
      (t) => t.type === "expense"
    );

    const income = monthTransactions
      .filter((t) => t.type === "income")
      .reduce((sum, t) => sum + Number(t.amount), 0);

    const expenses = expensesList.reduce(
      (sum, t) => sum + Number(t.amount),
      0
    );

    const savings = income - expenses;
    const savingsRate = income > 0 ? (savings / income) * 100 : 0;

    const categoryTotals = {};

    expensesList.forEach((t) => {
      const category = t.category || "Other";
      categoryTotals[category] =
        (categoryTotals[category] || 0) + Number(t.amount);
    });

    const highestCategory = Object.entries(categoryTotals).sort(
      (a, b) => b[1] - a[1]
    )[0];

    // Compare spending with monthly budgets.
    const budgetAnalysis = budgets.map((budget) => {
      const spent = categoryTotals[budget.category] || 0;
      const limit = Number(budget.amount);
      const remaining = limit - spent;
      const percentUsed = limit > 0 ? (spent / limit) * 100 : 0;

      return {
        category: budget.category,
        limit,
        spent,
        remaining,
        percentUsed: Number(percentUsed.toFixed(1)),
        exceeded: spent > limit,
      };
    });

    const overspending = budgetAnalysis.filter((b) => b.exceeded);

    // Detect unusually large expenses using the previous 3 months.
    const historicalExpenses = transactions.filter((t) => {
      const date = new Date(t.date);
      return (
        t.type === "expense" &&
        date >= historyStart &&
        date < startOfMonth
      );
    });

    const unusualExpenses = expensesList.filter((current) => {
      const previous = historicalExpenses.filter(
        (t) =>
          t.category.toLowerCase() === current.category.toLowerCase()
      );

      if (previous.length < 3) return false;

      const average =
        previous.reduce((sum, t) => sum + Number(t.amount), 0) /
        previous.length;

      return Number(current.amount) >= average * 2 && Number(current.amount) > 0;
    }).map((t) => ({
      category: t.category,
      amount: Number(t.amount),
      date: t.date,
      notes: t.notes || "",
      message: `This ${t.category} expense is unusually high compared with your previous spending.`,
    }));

    // Generate personalized recommendations.
    const insights = [];
    const recommendations = [];

    insights.push(
      `You have spent ₹${expenses.toLocaleString("en-IN")} this month.`
    );

    if (income > 0) {
      insights.push(
        savings >= 0
          ? `You have ₹${savings.toLocaleString("en-IN")} left from your recorded income.`
          : `Your expenses exceed your income by ₹${Math.abs(savings).toLocaleString("en-IN")}.`
      );

      if (savingsRate >= 20) {
        recommendations.push("Great savings! Try to maintain a savings rate of at least 20%.");
      } else if (savingsRate >= 0) {
        recommendations.push("Try to save at least 20% of your monthly income.");
      } else {
        recommendations.push("Review non-essential spending because your expenses exceed your income.");
      }
    } else {
      insights.push("Add your income to get more useful savings insights.");
    }

    if (highestCategory) {
      insights.push(
        `${highestCategory[0]} is your highest spending category at ₹${highestCategory[1].toLocaleString("en-IN")}.`
      );
      recommendations.push(
        `Review your ${highestCategory[0]} spending to find possible savings.`
      );
    }

    if (overspending.length > 0) {
      overspending.forEach((b) => {
        insights.push(
          `Your ${b.category} spending is ₹${b.spent.toLocaleString("en-IN")}, exceeding its budget by ₹${(b.spent - b.limit).toLocaleString("en-IN")}.`
        );
      });
    } else if (budgets.length > 0) {
      recommendations.push("You are within all your recorded monthly category budgets.");
    }

    if (unusualExpenses.length > 0) {
      insights.push(`${unusualExpenses.length} unusually large expense(s) detected.`);
      recommendations.push("Review unusually large expenses to make sure they are correct.");
    } else {
      insights.push("No unusually large expenses were detected using available spending history.");
    }

    if (expenses === 0) {
      insights.push("No expenses are recorded for this month yet.");
    }

    if (budgets.length === 0) {
      recommendations.push("Create monthly budgets to track your category spending.");
    }

    // Simple financial health score based on available monthly data.
    let healthScore = 50;

    if (income > 0) {
      healthScore += Math.max(0, Math.min(30, savingsRate * 0.6));
    }

    if (budgets.length > 0) {
      const withinBudget = budgets.length - overspending.length;
      healthScore += (withinBudget / budgets.length) * 20;
    }

    healthScore = Math.round(Math.max(0, Math.min(100, healthScore)));

    res.json({
      month: now.toLocaleString("en-IN", {
        month: "long",
        year: "numeric",
      }),
      income,
      expenses,
      savings,
      savingsRate: Number(savingsRate.toFixed(1)),
      highestCategory: highestCategory
        ? { category: highestCategory[0], amount: highestCategory[1] }
        : null,
      budgetAnalysis,
      overspending,
      unusualExpenses,
      healthScore,
      insights,
      recommendations,
    });
  } catch (error) {
    console.error("AI insights error:", error.message);
    res.status(500).json({
      message: "Could not generate financial insights.",
    });
  }
};

module.exports = { getAIInsights };
