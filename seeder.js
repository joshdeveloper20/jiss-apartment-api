const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Room = require("./models/Rooms");
const rooms = require("../roomData/rooms").default;
dotenv.config();

mongoose.connect(process.env.MONGO_URI);

// Function to seed the database
async function seedDatabase() {
  try {
    // Clear existing data
    await User.deleteMany();

    // Create a default admin User
    const createdUser = await User.create({
      name: "pius",
      email: "jissapartmenttech@gmail.com",
      password: "Manifestation",
      role: "admin",
    });

    // Assign default admin User to each room
    const userID = createdUser._id;
    const sampleRooms = rooms.map((room) => {
      return { ...room, user: userID };
    });

    // Insert the rooms into the database
    await Room.insertMany(sampleRooms);

    console.log("room data seeded successfully");
    process.exit();
  } catch (error) {
    console.error("Error seeding the data", error);
    process.exit(1);
  }
}

seedDatabase();
