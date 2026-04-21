const Room = require("../models/Rooms");

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

module.exports = {
  getRooms,
  getRoomById,
  createRoom,
};
