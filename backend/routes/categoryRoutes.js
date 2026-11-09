const express = require("express");

const {
  getCategories,
  createCategory,
} = require("../controllers/categoryController");

const protect = require("../middleware/authMiddleware");

const router = express.Router();

// Get all categories
router.get("/", protect, getCategories);

// Create custom category
router.post("/", protect, createCategory);

module.exports = router;