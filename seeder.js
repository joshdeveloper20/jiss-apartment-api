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
    // Clear existing users
    await User.deleteMany();

    // Create a default admin User
    const createdUser = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "jissapartmenttech@gmail.com",
      password: "Manifestation",
      role: "admin",
    });

    console.log("User data seeded successfully");
    process.exit();
  } catch (error) {
    console.error("Error seeding the data", error);
    process.exit(1);
  }
}

seedDatabase();
