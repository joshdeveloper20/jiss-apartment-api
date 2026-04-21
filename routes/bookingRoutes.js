const express = require("express");
const {
  getBookings,
  getBookingByCode,
  createBooking,
  updateBooking,
  deleteBooking,
  getBookingStats,
  getUserBookings,
  getRoomBookings,
  paystackWebhook,
  verifyPayment,
} = require("../controllers/bookings");
const { protect, admin } = require("../middleware/authMiddleware");

const router = express.Router();

// Webhook (handle first)
router.post("/webhook/paystack", paystackWebhook);

// Payment verification
router.post("/verify-payment", verifyPayment);

// Specific GET routes
router.get("/stats/dashboard", protect, admin, getBookingStats);
router.get("/search/:code", protect, admin, getBookingByCode);
router.get("/room/:roomId", getRoomBookings);
router.get("/user/:userId", getUserBookings);

// General routes
router.get("/", protect, admin, getBookings);
router.post("/", createBooking);
router.put("/:id", protect, admin, updateBooking);
router.delete("/:id", protect, admin, deleteBooking);

module.exports = router;
