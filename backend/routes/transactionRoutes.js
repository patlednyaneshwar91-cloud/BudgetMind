const express = require("express");

const {
  createTransaction,
  getTransactions,
  updateTransaction,
  deleteTransaction,
} = require("../controllers/transactionController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create transaction
router.post("/", protect, createTransaction);

// Get all transactions
router.get("/", protect, getTransactions);

// Update transaction
router.put("/:id", protect, updateTransaction);

// Delete transaction
router.delete("/:id", protect, deleteTransaction);

module.exports = router;