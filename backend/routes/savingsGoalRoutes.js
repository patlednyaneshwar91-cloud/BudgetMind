const express = require("express");

const {
  createSavingsGoal,
  getSavingsGoals,
  updateSavingsGoal,
  addSavings,
  deleteSavingsGoal,
} = require("../controllers/savingsGoalController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", protect, createSavingsGoal);
router.get("/", protect, getSavingsGoals);
router.put("/:id", protect, updateSavingsGoal);
router.post("/:id/add", protect, addSavings);
router.delete("/:id", protect, deleteSavingsGoal);

module.exports = router;