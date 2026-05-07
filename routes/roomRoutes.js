const express = require("express");
const {
  getRooms,
  getRoomById,
  createRoom,
  checkAvailability,
} = require("../controllers/rooms");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", getRooms);
router.get("/:id/availability", checkAvailability);
router.get("/:id", getRoomById);
router.post("/", protect, createRoom);

module.exports = router;
