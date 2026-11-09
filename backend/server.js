
require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cookieParser = require("cookie-parser");
const cors = require("cors");

// Import routes
const authRoutes = require("./routes/authRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const budgetRoutes = require("./routes/budgetRoutes");
const aiRoutes = require("./routes/aiRoutes");
const categoryRoutes = require("./routes/categoryRoutes");
const savingsGoalRoutes = require("./routes/savingsGoalRoutes");


const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());

app.use(
  cors({
  origin: ["http://localhost:5173", "http://localhost:5174"],
  credentials: true,
})
);

// Home route
app.get("/", (req, res) => {
  res.json({
    message: "BudgetMind Backend is running!",
  });
});

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/transactions", transactionRoutes);
app.use("/api/budgets", budgetRoutes);
app.use("/api/ai", aiRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/savings-goals", savingsGoalRoutes);

// Server port
const PORT = process.env.PORT || 5001;

// Connect MongoDB and start server
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error("MongoDB connection failed:", error.message);
  });
