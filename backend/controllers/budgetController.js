const Budget = require("../models/Budget");

// CREATE BUDGET
const createBudget = async (req, res) => {
  try {
    const { category, amount, month } = req.body;

    if (!category || amount === undefined || !month) {
      return res.status(400).json({
        message: "Category, amount and month are required",
      });
    }

    const budget = await Budget.create({
      user: req.user.userId,
      category,
      amount,
      month,
    });

    res.status(201).json({
      message: "Budget created successfully",
      budget,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "Budget already exists for this category and month",
      });
    }

    res.status(500).json({
      message: "Failed to create budget",
      error: error.message,
    });
  }
};

// GET BUDGETS
const getBudgets = async (req, res) => {
  try {
    const budgets = await Budget.find({
      user: req.user.userId,
    }).sort({ category: 1 });

    res.status(200).json({
      budgets,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get budgets",
      error: error.message,
    });
  }
};

// UPDATE BUDGET
const updateBudget = async (req, res) => {
  try {
    const { category, amount, month } = req.body;

    const budget = await Budget.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      {
        category,
        amount,
        month,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    res.status(200).json({
      message: "Budget updated successfully",
      budget,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update budget",
      error: error.message,
    });
  }
};

// DELETE BUDGET
const deleteBudget = async (req, res) => {
  try {
    const budget = await Budget.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!budget) {
      return res.status(404).json({
        message: "Budget not found",
      });
    }

    res.status(200).json({
      message: "Budget deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete budget",
      error: error.message,
    });
  }
};

module.exports = {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
};