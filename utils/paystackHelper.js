const crypto = require("crypto");
const Booking = require("../models/Booking");
const sendEmail = require("./sendEmail");
const sendAdminNotification = require("./sendAdminNotification");
const Room = require("../models/Rooms");

const verifyPaystackSignature = (req) => {
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_TEST_SECRET_KEY)
    .update(JSON.stringify(req.body))
    .digest("hex");

  return hash === req.headers["x-paystack-signature"];
};

const handlePaymentSuccess = async (reference) => {
  try {
    // Find booking by paystack reference
    const booking = await Booking.findOne({
      paystackReference: reference,
    }).populate("room", "name");

    if (!booking) {
      console.log(`Booking not found for reference: ${reference}`);
      return { success: false, message: "Booking not found" };
    }

    // Update booking payment status
    booking.paymentStatus = "completed";
    booking.status = "confirmed";
    await booking.save();

    const room = booking.room;

    // Send confirmation email to guest
    try {
      await sendEmail({
        to: booking.guestEmail,
        subject: `Payment Received - ${booking.bookingCode}`,
        text: `Hello ${booking.guestName},\n\nYour payment has been successfully received for booking ${booking.bookingCode}.\n\nBooking code: ${booking.bookingCode}\nRoom: ${room.name}\nCheck-in: ${new Date(booking.checkInDate).toDateString()}\nCheck-out: ${new Date(booking.checkOutDate).toDateString()}\nTotal amount paid: ₦${booking.totalPrice.toFixed(2)}\n\nYour booking is now confirmed. We look forward to hosting you.\n\nBest regards,\nJiss Apartment`,
        html: `<p>Hello ${booking.guestName},</p><p>Your payment has been successfully received for booking <strong>${booking.bookingCode}</strong>.</p><ul><li><strong>Room:</strong> ${room.name}</li><li><strong>Check-in:</strong> ${new Date(booking.checkInDate).toDateString()}</li><li><strong>Check-out:</strong> ${new Date(booking.checkOutDate).toDateString()}</li><li><strong>Total amount paid:</strong> ₦${booking.totalPrice.toFixed(2)}</li></ul><p>Your booking is now confirmed. We look forward to hosting you.</p><p><strong>Jiss Apartment</strong></p>`,
      });
    } catch (emailError) {
      console.error("Error sending payment confirmation email:", emailError);
    }

    // Send admin notification
    try {
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

    return { success: true, message: "Payment verified and booking confirmed" };
  } catch (error) {
    console.error("Error in handlePaymentSuccess:", error);
    return { success: false, message: "Error processing payment" };
  }
};

module.exports = {
  verifyPaystackSignature,
  handlePaymentSuccess,
};
