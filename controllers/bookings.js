const Booking = require("../models/Booking");
const Room = require("../models/Rooms");
const User = require("../models/User");
const sendEmail = require("../utils/sendEmail");
const sendAdminNotification = require("../utils/sendAdminNotification");
const { handlePaymentSuccess } = require("../utils/paystackHelper");

// @desc    Get all bookings
// @route   GET /api/bookings
// @access  Admin
const getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    // Get total count for pagination
    const totalBookings = await Booking.countDocuments({ deleted: false });

    const bookings = await Booking.find({ deleted: false })
      .populate("room", "name price_per_night")
      .populate("user", "name email")
      .sort({ createdAt: -1 }) // Sort by newest first
      .skip(skip)
      .limit(limit);

    const totalPages = Math.ceil(totalBookings / limit);

    res.json({
      bookings,
      totalBookings,
      totalPages,
      currentPage: page,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching bookings" });
  }
};

// @desc    Get booking by code
// @route   GET /api/bookings/search/:code
// @access  Admin
const getBookingByCode = async (req, res) => {
  try {
    const { code } = req.params;
    const booking = await Booking.findOne({ bookingCode: code, deleted: false })
      .populate("room", "name price_per_night")
      .populate("user", "name email");

    if (!booking) {
      return res.status(404).json({ message: "Booking not found" });
    }
    res.json(booking);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching booking" });
  }
};

// @desc    Get all bookings for a room
// @route   GET /api/bookings/room/:roomId
// @access  Public
const getRoomBookings = async (req, res) => {
  try {
    const { roomId } = req.params;
    const bookings = await Booking.find({ room: roomId, deleted: false }).sort({
      checkInDate: 1,
    });
    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching room bookings" });
  }
};

// @desc    Create a new booking
// @route   POST /api/bookings
// @access  Public
const createBooking = async (req, res) => {
  try {
    const {
      roomId,
      userId,
      checkInDate,
      checkOutDate,
      numberOfNights,
      totalPrice,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      paymentMethod,
    } = req.body;

    // Validate required fields
    if (
      !roomId ||
      !checkInDate ||
      !checkOutDate ||
      numberOfNights === undefined ||
      numberOfNights === null ||
      totalPrice === undefined ||
      totalPrice === null ||
      !guestName ||
      !guestEmail ||
      !guestPhone ||
      !paymentMethod
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Validate dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    if (checkIn >= checkOut) {
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date" });
    }

    // Verify room exists
    const room = await Room.findById(roomId);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    let bookingUser = null;
    if (userId) {
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      bookingUser = user._id;
    }

    const overlappingBooking = await Booking.findOne({
      room: roomId,
      deleted: false,
      checkInDate: { $lt: checkOut },
      checkOutDate: { $gt: checkIn },
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: "Room is already booked for the selected dates.",
      });
    }

    const booking = new Booking({
      room: roomId,
      user: bookingUser,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfNights,
      totalPrice,
      guestName,
      guestEmail,
      guestPhone,
      specialRequests,
      paymentMethod,
      status: "confirmed",
      paymentStatus: "pending", // Always start as pending - admin updates after payment
    });

    await booking.save();
    const populatedBooking = await booking.populate(
      "room",
      "name price_per_night",
    );
    if (bookingUser) {
      await populatedBooking.populate("user", "name email");
    }

    // Send response immediately - emails will be sent in background
    res.status(201).json({
      message: "Booking created successfully",
      booking: populatedBooking,
    });

    // Send guest confirmation email asynchronously (non-blocking)
    sendEmail({
      to: guestEmail,
      subject: `Booking confirmation - ${booking.bookingCode}`,
      text: `Hello ${guestName},\n\nThank you for booking with Jiss Apartment. Your booking has been confirmed.\n\nBooking code: ${booking.bookingCode}\nRoom: ${room.name}\nCheck-in: ${checkIn.toDateString()}\nCheck-out: ${checkOut.toDateString()}\nNights: ${numberOfNights}\nTotal: ₦${totalPrice.toFixed(2)}\nPayment method: ${paymentMethod === "pay_now" ? "Pay Now" : "Pay on Arrival"}\n\nWe look forward to hosting you.\n\nBest regards,\nJiss Apartment`,
      html: `<p>Hello ${guestName},</p><p>Thank you for booking with <strong>Jiss Apartment</strong>. Your booking has been confirmed.</p><ul><li><strong>Booking code:</strong> ${booking.bookingCode}</li><li><strong>Room:</strong> ${room.name}</li><li><strong>Check-in:</strong> ${checkIn.toDateString()}</li><li><strong>Check-out:</strong> ${checkOut.toDateString()}</li><li><strong>Nights:</strong> ${numberOfNights}</li><li><strong>Total:</strong> ₦${totalPrice.toFixed(2)}</li><li><strong>Payment method:</strong> ${paymentMethod === "pay_now" ? "Pay Now" : "Pay on Arrival"}</li></ul><p>We look forward to hosting you.</p><p><strong>Jiss Apartment</strong></p>`,
    }).catch((error) => {
      console.error(
        `[EMAIL ERROR] Failed to send booking confirmation to ${guestEmail}: ${error.message}`,
      );
    });

    // Send admin notification asynchronously (non-blocking)
    sendAdminNotification({
      bookingCode: booking.bookingCode,
      roomName: room.name,
      guestName,
      guestEmail,
      checkInDate: checkIn,
      checkOutDate: checkOut,
      numberOfNights,
      totalPrice,
      paymentMethod,
      paymentStatus: booking.paymentStatus,
    }).catch((error) => {
      console.error(
        `[EMAIL ERROR] Failed to send admin notification for booking ${booking.bookingCode}: ${error.message}`,
      );
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating booking" });
  }
};

// @desc    Update booking details
// @route   PUT /api/bookings/:id
// @access  Admin
const updateBooking = async (req, res) => {
  try {
    const { id } = req.params;
    const { room, roomId, checkInDate, checkOutDate, status, paymentStatus } =
      req.body;

    const booking = await Booking.findById(id);
    if (!booking || booking.deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }

    const newRoomId = room || roomId || booking.room;
    const newCheckIn = checkInDate
      ? new Date(checkInDate)
      : booking.checkInDate;
    const newCheckOut = checkOutDate
      ? new Date(checkOutDate)
      : booking.checkOutDate;

    if (newCheckIn >= newCheckOut) {
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date" });
    }

    if (room || roomId) {
      const roomExists = await Room.findById(newRoomId);
      if (!roomExists) {
        return res.status(404).json({ message: "Room not found" });
      }
    }

    const overlappingBooking = await Booking.findOne({
      _id: { $ne: id },
      room: newRoomId,
      deleted: false,
      checkInDate: { $lt: newCheckOut },
      checkOutDate: { $gt: newCheckIn },
    });

    if (overlappingBooking) {
      return res.status(400).json({
        message: "Room is already booked for the selected dates.",
      });
    }

    const finalRoom = await Room.findById(newRoomId);
    const nights = Math.ceil(
      (newCheckOut.getTime() - newCheckIn.getTime()) / (1000 * 3600 * 24),
    );
    const totalPrice = nights * finalRoom.price_per_night;

    const updateData = {
      room: newRoomId,
      checkInDate: newCheckIn,
      checkOutDate: newCheckOut,
      numberOfNights: nights,
      totalPrice,
    };

    if (status !== undefined) updateData.status = status;
    if (paymentStatus !== undefined) updateData.paymentStatus = paymentStatus;

    const updatedBooking = await Booking.findByIdAndUpdate(id, updateData, {
      new: true,
    })
      .populate("room", "name price_per_night")
      .populate("user", "name email");

    res.json({
      message: "Booking updated successfully",
      booking: updatedBooking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error updating booking" });
  }
};

// @desc    Soft delete booking to trash
// @route   DELETE /api/bookings/:id
// @access  Admin
const deleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking || booking.deleted) {
      return res.status(404).json({ message: "Booking not found" });
    }

    booking.deleted = true;
    booking.deletedAt = new Date();
    await booking.save();

    res.json({
      message: "Booking moved to trash successfully",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting booking" });
  }
};

// @desc    Get deleted bookings (trash)
// @route   GET /api/bookings/trash
// @access  Admin
const getDeletedBookings = async (req, res) => {
  try {
    const bookings = await Booking.find({ deleted: true })
      .populate("room", "name price_per_night")
      .populate("user", "name email")
      .sort({ deletedAt: -1 });

    res.json({ bookings });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching trash" });
  }
};

// @desc    Restore booking from trash
// @route   PUT /api/bookings/:id/restore
// @access  Admin
const restoreBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findById(id);
    if (!booking || !booking.deleted) {
      return res.status(404).json({ message: "Booking not found in trash" });
    }

    booking.deleted = false;
    booking.deletedAt = null;
    await booking.save();

    res.json({
      message: "Booking restored successfully",
      booking,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error restoring booking" });
  }
};

// @desc    Permanently delete booking from trash
// @route   DELETE /api/bookings/:id/permanent
// @access  Admin
const permanentDeleteBooking = async (req, res) => {
  try {
    const { id } = req.params;

    const booking = await Booking.findOne({ _id: id, deleted: true });
    if (!booking) {
      return res.status(404).json({ message: "Booking not found in trash" });
    }

    await Booking.findByIdAndDelete(id);

    res.json({ message: "Booking permanently deleted" });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ message: "Server error permanently deleting booking" });
  }
};

// @desc    Restore all bookings from trash
// @route   PUT /api/bookings/trash/restore-all
// @access  Admin
const restoreAllBookings = async (req, res) => {
  try {
    const result = await Booking.updateMany(
      { deleted: true },
      { deleted: false, deletedAt: null },
    );

    res.json({
      message: "All trashed bookings restored successfully",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error restoring all bookings" });
  }
};

// @desc    Permanently delete all bookings from trash
// @route   DELETE /api/bookings/trash/empty
// @access  Admin
const emptyTrashBookings = async (req, res) => {
  try {
    const result = await Booking.deleteMany({ deleted: true });
    res.json({
      message: "Trash emptied successfully",
      count: result.deletedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error emptying trash" });
  }
};

// @desc    Soft delete all active bookings to trash
// @route   DELETE /api/bookings
// @access  Admin
const deleteAllBookings = async (req, res) => {
  try {
    const result = await Booking.updateMany(
      { deleted: false },
      { deleted: true, deletedAt: new Date() },
    );

    res.json({
      message: "All bookings moved to trash successfully",
      count: result.modifiedCount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error deleting all bookings" });
  }
};

// @desc    Get booking statistics (for dashboard)
// @route   GET /api/bookings/stats/dashboard
// @access  Admin
const getBookingStats = async (req, res) => {
  try {
    const totalBookings = await Booking.countDocuments({ deleted: false });
    const totalUsers = await User.countDocuments();
    const totalRooms = await Room.countDocuments();
    const confirmedBookings = await Booking.countDocuments({
      status: "confirmed",
      deleted: false,
    });
    const pendingBookings = await Booking.countDocuments({
      status: "pending",
      deleted: false,
    });

    const recentBookings = await Booking.find({ deleted: false })
      .sort({ createdAt: -1 })
      .limit(10)
      .populate("room", "name price_per_night")
      .populate("user", "name email");

    res.json({
      totalBookings,
      totalUsers,
      totalRooms,
      confirmedBookings,
      pendingBookings,
      recentBookings,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching statistics" });
  }
};

// @desc    Get bookings for a specific user
// @route   GET /api/bookings/user/:userId
// @access  Public
const getUserBookings = async (req, res) => {
  try {
    const { userId } = req.params;
    const bookings = await Booking.find({ user: userId, deleted: false })
      .populate("room", "name price_per_night category")
      .sort({ createdAt: -1 });

    res.json(bookings);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching user bookings" });
  }
};

// @desc    Handle Paystack Webhook
// @route   POST /api/bookings/webhook/paystack
// @access  Public (but protected with signature verification)
const paystackWebhook = async (req, res) => {
  const { verifyPaystackSignature } = require("../utils/paystackHelper");

  // Verify the signature
  if (!verifyPaystackSignature(req)) {
    return res.status(400).json({ message: "Invalid signature" });
  }

  const { event, data } = req.body;

  // Only handle successful charge event
  if (event === "charge.success") {
    const result = await handlePaymentSuccess(data.reference);
    if (result.success) {
      return res.json({ message: result.message });
    } else {
      return res.status(400).json({ message: result.message });
    }
  }

  res.json({ message: "Event received" });
};

// @desc    Verify Paystack payment from client
// @route   POST /api/bookings/verify-payment
// @access  Public
const verifyPayment = async (req, res) => {
  try {
    const { reference } = req.body;

    if (!reference) {
      return res.status(400).json({ message: "Payment reference is required" });
    }

    // Extract booking code from reference (format: bookingCode-timestamp)
    const bookingCode = reference.split("-")[0];

    // Find booking by booking code
    const booking = await Booking.findOne({
      bookingCode: bookingCode,
    }).populate("room", "name");

    if (!booking) {
      return res
        .status(404)
        .json({ message: "Booking not found for this payment" });
    }

    // If payment already completed, just return success
    if (booking.paymentStatus === "completed") {
      return res.json({
        success: true,
        message: "Payment already verified",
        booking: booking,
      });
    }

    // Update payment status and store reference
    booking.paymentStatus = "completed";
    booking.paystackReference = reference;
    booking.status = "confirmed";
    await booking.save();

    // Send confirmation email to guest
    try {
      const room = booking.room;
      await sendEmail({
        to: booking.guestEmail,
        subject: `Payment Received - ${booking.bookingCode}`,
        text: `Hello ${booking.guestName},\n\nYour payment has been successfully received for booking ${booking.bookingCode}.\n\nBooking code: ${booking.bookingCode}\nRoom: ${room.name}\nCheck-in: ${new Date(booking.checkInDate).toDateString()}\nCheck-out: ${new Date(booking.checkOutDate).toDateString()}\nTotal amount paid: ₦${booking.totalPrice.toFixed(2)}\n\nYour booking is now confirmed. We look forward to hosting you.\n\nBest regards,\nJiss Apartment`,
        html: `<p>Hello ${booking.guestName},</p><p>Your payment has been successfully received for booking <strong>${booking.bookingCode}</strong>.</p><ul><li><strong>Room:</strong> ${room.name}</li><li><strong>Check-in:</strong> ${new Date(booking.checkInDate).toDateString()}</li><li><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toDateString()}</li><li><strong>Total amount paid:</strong> ₦${booking.totalPrice.toFixed(2)}</li></ul><p>Your booking is now confirmed. We look forward to hosting you.</p><p><strong>Jiss Apartment</strong></p>`,
      });
    } catch (emailError) {
      console.error("Error sending payment confirmation email:", emailError);
    }

    // Send admin notification after payment
    try {
      const room = booking.room;
      await sendAdminNotification({
        bookingCode: booking.bookingCode,
        roomName: room.name,
        guestName: booking.guestName,
        guestEmail: booking.guestEmail,
        checkInDate: booking.checkInDate,
        checkOutDate: booking.checkOutDate,
        numberOfNights: booking.numberOfNights,
        totalPrice: booking.totalPrice,
        paymentMethod: booking.paymentMethod,
        paymentStatus: "completed",
      });
    } catch (adminError) {
      console.error("Error sending admin notification:", adminError);
    }

    return res.json({
      success: true,
      message: "Payment verified successfully",
      booking: booking,
    });
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({ message: "Error verifying payment" });
  }
};

module.exports = {
  getBookings,
  getBookingByCode,
  getRoomBookings,
  createBooking,
  updateBooking,
  deleteBooking,
  getDeletedBookings,
  restoreBooking,
  restoreAllBookings,
  permanentDeleteBooking,
  deleteAllBookings,
  emptyTrashBookings,
  getBookingStats,
  getUserBookings,
  paystackWebhook,
  verifyPayment,
};
