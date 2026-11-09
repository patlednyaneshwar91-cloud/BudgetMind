const express = require("express");

const {
  createBudget,
  getBudgets,
  updateBudget,
  deleteBudget,
} = require("../controllers/budgetController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Create budget
router.post("/", protect, createBudget);

// Get all budgets
router.get("/", protect, getBudgets);

// Update budget
router.put("/:id", protect, updateBudget);

// Delete budget
router.delete("/:id", protect, deleteBudget);

module.exports = router;