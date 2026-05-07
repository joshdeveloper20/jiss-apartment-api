const Room = require("../models/Rooms");
const Booking = require("../models/Booking");

// @desc    Get all rooms
// @route   GET /api/rooms
// @access  Public
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({});
    res.json(rooms);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error fetching rooms" });
  }
};

// @desc    Get a single room by ID
// @route   GET /api/rooms/:id
// @access  Public
const getRoomById = async (req, res) => {
  try {
    const room = await Room.findById(req.params.id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }
    res.json(room);
  } catch (error) {
    console.error(error);
    if (error.kind === "ObjectId") {
      return res.status(404).json({ message: "Room not found" });
    }
    res.status(500).json({ message: "Server error fetching room" });
  }
};

// @desc    Create a new room
// @route   POST /api/rooms
// @access  Admin
const createRoom = async (req, res) => {
  try {
    const {
      name,
      slug,
      category,
      tagline,
      description,
      size,
      price_per_night,
      amenities,
      images,
      is_smart_home,
      userId,
    } = req.body;

    // Validate required fields
    if (
      !name ||
      !slug ||
      !category ||
      !tagline ||
      !description ||
      !size ||
      !price_per_night ||
      !userId
    ) {
      return res
        .status(400)
        .json({ message: "Please provide all required fields" });
    }

    // Check if slug already exists
    const existingRoom = await Room.findOne({ slug });
    if (existingRoom) {
      return res
        .status(400)
        .json({ message: "Room with this slug already exists" });
    }

    const room = new Room({
      name,
      slug: slug.toLowerCase().trim(),
      category,
      tagline,
      description: Array.isArray(description) ? description : [description],
      size,
      price_per_night,
      amenities: amenities || [],
      images: images || [],
      is_smart_home: is_smart_home || false,
      user: userId,
    });

    await room.save();
    res.status(201).json({
      message: "Room created successfully",
      room,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error creating room" });
  }
};

// @desc    Check room availability for given dates
// @route   GET /api/rooms/:id/availability
// @access  Public
const checkAvailability = async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInDate, checkOutDate } = req.query;

    // Validate required parameters
    if (!checkInDate || !checkOutDate) {
      return res
        .status(400)
        .json({ message: "Please provide checkInDate and checkOutDate" });
    }

    // Validate room exists
    const room = await Room.findById(id);
    if (!room) {
      return res.status(404).json({ message: "Room not found" });
    }

    // Parse dates
    const checkIn = new Date(checkInDate);
    const checkOut = new Date(checkOutDate);

    // Validate dates
    if (isNaN(checkIn.getTime()) || isNaN(checkOut.getTime())) {
      return res
        .status(400)
        .json({ message: "Invalid date format. Please use YYYY-MM-DD" });
    }

    if (checkOut <= checkIn) {
      return res
        .status(400)
        .json({ message: "Check-out date must be after check-in date" });
    }

    // Find overlapping bookings
    const conflictingBookings = await Booking.find({
      room: id,
      $or: [
        {
          checkInDate: { $lt: checkOut },
          checkOutDate: { $gt: checkIn },
        },
      ],
    });

    const isAvailable = conflictingBookings.length === 0;
    const numberOfNights = Math.ceil(
      (checkOut - checkIn) / (1000 * 60 * 60 * 24),
    );

    res.json({
      isAvailable,
      numberOfNights,
      conflictingBookings: conflictingBookings.length,
      message: isAvailable
        ? "Room is available for the selected dates"
        : `Room is not available. There are ${conflictingBookings.length} conflicting booking(s)`,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Server error checking availability" });
  }
};

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
  checkAvailability,
};
