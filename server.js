const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");
const connectDB = require("./config/db");
const userRoutes = require("./routes/userRoutes");
const roomRoutes = require("./routes/roomRoutes");
const bookingRoutes = require("./routes/bookingRoutes");

const app = express();

dotenv.config();

// Middleware for webhook (before JSON parsing)
app.use(express.json());
app.use(cors());

const PORT = process.env.PORT || 3000;

// Connect to the database
connectDB();

app.get("/", (req, res) => {
  res.send("Welcome to the backend server!");
});

// API Routes
app.use("/api/users", userRoutes);
app.use("/api/rooms", roomRoutes);
app.use("/api/bookings", bookingRoutes);

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
