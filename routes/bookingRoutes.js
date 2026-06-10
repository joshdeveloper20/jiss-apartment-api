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
  getDeletedBookings,
  restoreBooking,
  restoreAllBookings,
  permanentDeleteBooking,
  deleteAllBookings,
  emptyTrashBookings,
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
router.delete("/", protect, admin, deleteAllBookings);
router.delete("/:id", protect, admin, deleteBooking);
router.get("/trash", protect, admin, getDeletedBookings);
router.put("/trash/restore-all", protect, admin, restoreAllBookings);
router.delete("/trash/empty", protect, admin, emptyTrashBookings);
router.put("/:id/restore", protect, admin, restoreBooking);
router.delete("/:id/permanent", protect, admin, permanentDeleteBooking);

module.exports = router;
