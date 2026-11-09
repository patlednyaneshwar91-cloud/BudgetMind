const Category = require("../models/Category");

// GET ALL CATEGORIES
const getCategories = async (req, res) => {
  try {
    const categories = await Category.find({
      user: req.user.userId,
    }).sort({ name: 1 });

    res.status(200).json({ categories });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get categories",
      error: error.message,
    });
  }
};

// CREATE CATEGORY
const createCategory = async (req, res) => {
  try {
    const { name, type } = req.body;

    if (!name || !type) {
      return res.status(400).json({
        message: "Category name and type are required",
      });
    }

    if (!["income", "expense"].includes(type)) {
      return res.status(400).json({
        message: "Invalid category type",
      });
    }

    const category = await Category.create({
      user: req.user.userId,
      name: name.trim(),
      type,
    });

    res.status(201).json({
      message: "Category created successfully",
      category,
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        message: "This category already exists",
      });
    }

    res.status(500).json({
      message: "Failed to create category",
      error: error.message,
    });
  }
};

module.exports = {
  getCategories,
  createCategory,
};