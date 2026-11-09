
const SavingsGoal = require("../models/SavingsGoal");

// CREATE SAVINGS GOAL
const createSavingsGoal = async (req, res) => {
  try {
    const { name, targetAmount, deadline, description } = req.body;

    if (!name || !targetAmount || Number(targetAmount) <= 0) {
      return res.status(400).json({
        message: "Goal name and a valid target amount are required",
      });
    }

    const goal = await SavingsGoal.create({
      user: req.user.userId,
      name,
      targetAmount: Number(targetAmount),
      deadline: deadline || null,
      description: description || "",
    });

    res.status(201).json({
      message: "Savings goal created successfully",
      goal,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create savings goal",
      error: error.message,
    });
  }
};

// GET ALL SAVINGS GOALS
const getSavingsGoals = async (req, res) => {
  try {
    const goals = await SavingsGoal.find({
      user: req.user.userId,
    }).sort({ createdAt: -1 });

    res.status(200).json({ goals });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get savings goals",
      error: error.message,
    });
  }
};

// UPDATE SAVINGS GOAL
const updateSavingsGoal = async (req, res) => {
  try {
    const { name, targetAmount, deadline, description } = req.body;

    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({
        message: "Savings goal not found",
      });
    }

    if (name !== undefined) goal.name = name;
    if (targetAmount !== undefined) goal.targetAmount = targetAmount;
    if (deadline !== undefined) goal.deadline = deadline || null;
    if (description !== undefined) goal.description = description;

    await goal.save();

    res.status(200).json({
      message: "Savings goal updated successfully",
      goal,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update savings goal",
      error: error.message,
    });
  }
};

// ADD MONEY TO SAVINGS GOAL
const addSavings = async (req, res) => {
  try {
    const { amount } = req.body;
    const savingsAmount = Number(amount);

    if (!Number.isFinite(savingsAmount) || savingsAmount <= 0) {
      return res.status(400).json({
        message: "Please enter a valid savings amount",
      });
    }

    const goal = await SavingsGoal.findOne({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({
        message: "Savings goal not found",
      });
    }

    goal.savedAmount += savingsAmount;
    await goal.save();

    res.status(200).json({
      message: "Savings added successfully",
      goal,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to add savings",
      error: error.message,
    });
  }
};

// DELETE SAVINGS GOAL
const deleteSavingsGoal = async (req, res) => {
  try {
    const goal = await SavingsGoal.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!goal) {
      return res.status(404).json({
        message: "Savings goal not found",
      });
    }

    res.status(200).json({
      message: "Savings goal deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete savings goal",
      error: error.message,
    });
  }
};

module.exports = {
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  addSavings,
  deleteSavingsGoal,
};
