const mongoose = require("mongoose");
const dotenv = require("dotenv");
const User = require("./models/User");
const Room = require("./models/Rooms");
const rooms = require("../roomData/rooms").default;
dotenv.config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("MongoDB connected successfully");
  } catch (error) {
    console.error("MongoDB connection failed:", error.message);
    process.exit(1);
  }
};

// Function to seed the database
async function seedDatabase() {
  await connectDB();

  try {
    // Clear existing data
    await User.deleteMany({});
    await Room.deleteMany({});

    // Create a default admin User
    const createdUser = await User.create({
      firstName: "Admin",
      lastName: "User",
      email: "jissapartmenttech@gmail.com",
      password: "Manifestation",
      role: "admin",
    });

    console.log("Admin user created:", createdUser.email);

    // Add user ID to each room
    const roomsWithUser = rooms.map((room) => ({
      ...room,
      user: createdUser._id,
    }));

    // Seed room data
    const createdRooms = await Room.insertMany(roomsWithUser);

    console.log("User data seeded successfully");
    console.log(`Created ${createdRooms.length} rooms`);
    process.exit();
  } catch (error) {
    console.error("Error seeding the data", error);
    process.exit(1);
  }
}

seedDatabase();
