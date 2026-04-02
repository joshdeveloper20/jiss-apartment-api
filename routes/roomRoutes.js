const express = require("express");
const { getRooms, getRoomById } = require("../controllers/rooms");

const router = express.Router();

router.get("/", getRooms);
router.get("/:id", getRoomById);

module.exports = router;
