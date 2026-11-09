const Transaction = require("../models/Transaction");

// CREATE TRANSACTION
const createTransaction = async (req, res) => {
  try {
    const {
      amount,
      category,
      date,
      notes,
      paymentMethod,
      type,
    } = req.body;

    if (!amount || !category || !type) {
      return res.status(400).json({
        message: "Amount, category and type are required",
      });
    }

    const transaction = await Transaction.create({
      user: req.user.userId,
      amount,
      category,
      date: date || Date.now(),
      notes,
      paymentMethod,
      type,
    });

    res.status(201).json({
      message: "Transaction created successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create transaction",
      error: error.message,
    });
  }
};

// GET TRANSACTIONS
const getTransactions = async (req, res) => {
  try {
    const transactions = await Transaction.find({
      user: req.user.userId,
    }).sort({ date: -1 });

    res.status(200).json({
      transactions,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get transactions",
      error: error.message,
    });
  }
};

// UPDATE TRANSACTION
const updateTransaction = async (req, res) => {
  try {
    const {
      amount,
      category,
      date,
      notes,
      paymentMethod,
      type,
    } = req.body;

    const transaction = await Transaction.findOneAndUpdate(
      {
        _id: req.params.id,
        user: req.user.userId,
      },
      {
        amount,
        category,
        date,
        notes,
        paymentMethod,
        type,
      },
      {
        new: true,
        runValidators: true,
      }
    );

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      message: "Transaction updated successfully",
      transaction,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to update transaction",
      error: error.message,
    });
  }
};

// DELETE TRANSACTION
const deleteTransaction = async (req, res) => {
  try {
    const transaction = await Transaction.findOneAndDelete({
      _id: req.params.id,
      user: req.user.userId,
    });

    if (!transaction) {
      return res.status(404).json({
        message: "Transaction not found",
      });
    }

    res.status(200).json({
      message: "Transaction deleted successfully",
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete transaction",
      error: error.message,
    });
  }
};

module.exports = {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
};