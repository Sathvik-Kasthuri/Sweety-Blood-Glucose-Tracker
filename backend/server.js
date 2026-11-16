const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const readingRoutes = require("./routes/readingRoutes");
const reportRoutes = require("./routes/reportRoutes");

const authMiddleware = require("./middleware/authMiddleware");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Sweety API is running");
});

//JWT Middleware
app.get("/api/protected", authMiddleware, (req, res) => {
  res.status(200).json({
    message: "You are authenticated!",
    userId: req.user.userId,
  });
});

//Authentication Routes

app.use("/api/auth", authRoutes);
app.use("/api/readings", readingRoutes);
app.use("/api/reports",reportRoutes);

//Test Database Connection

pool
  .query("SELECT NOW()")
  .then((result) => {
    console.log("PostgreSQL Connected Successfully");
    console.log("Database Time", result.rows[0].now);
  })
  .catch((error) => {
    console.log("Database connection failed:", error.message);
  });

const port = process.env.PORT || 5000;

app.listen(port, () => {
  console.log(`Server running on the ${port}`);
});
