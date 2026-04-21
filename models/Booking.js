const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    bookingCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    room: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Room",
      required: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: false,
    },
    checkInDate: {
      type: Date,
      required: true,
    },
    checkOutDate: {
      type: Date,
      required: true,
    },
    numberOfNights: {
      type: Number,
      required: true,
    },
    totalPrice: {
      type: Number,
      required: true,
    },
    guestName: {
      type: String,
      required: true,
      trim: true,
    },
    guestEmail: {
      type: String,
      required: true,
      trim: true,
      match: [/.+\@.+\..+/, "Please enter a valid email address"],
    },
    guestPhone: {
      type: String,
      required: true,
      trim: true,
    },
    paymentMethod: {
      type: String,
      enum: ["pay_on_arrival", "pay_now"],
      required: true,
      default: "pay_on_arrival",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "cancelled"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["pending", "completed", "failed"],
      default: "pending",
    },
    paystackReference: {
      type: String,
      default: null,
    },
    specialRequests: {
      type: String,
      default: "",
    },
  },
  { timestamps: true },
);

// Generate unique booking code before validating
bookingSchema.pre("validate", async function () {
  if (this.isNew) {
    let code;
    let exists = true;
    while (exists) {
      code =
        "BK" +
        Date.now().toString().slice(-8) +
        Math.random().toString(36).substring(2, 5).toUpperCase();
      exists = await mongoose.model("Booking").findOne({ bookingCode: code });
    }
    this.bookingCode = code;
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
