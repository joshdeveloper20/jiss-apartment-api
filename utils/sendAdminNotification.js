const nodemailer = require("nodemailer");

const createTransporter = () => {
  return nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    requireTLS: true,
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
    connectionTimeout: 5000,
    socketTimeout: 5000,
    family: 4,
  });
};

const formatDate = (value) => {
  if (!value) return "";
  return new Date(value).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
};

const sendAdminNotification = async ({
  bookingCode,
  roomName,
  guestName,
  guestEmail,
  checkInDate,
  checkOutDate,
  numberOfNights,
  totalPrice,
  paymentMethod,
  paymentStatus,
}) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error(
      "[EMAIL CONFIG ERROR] Cannot send admin notification: Missing EMAIL_USER or EMAIL_PASS environment variables.",
    );
    return { success: false, error: "Email service not configured" };
  }

  try {
    const transporter = createTransporter();

    const adminEmail = process.env.ADMIN_EMAIL || process.env.EMAIL_USER;
    const subject = `New Booking Notification - ${bookingCode}`;

    const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111">
      <h2 style="color:#8b5e3c;">New Booking Received</h2>
      <p>A new booking has been made on your property. Below are the details:</p>
      <h3>Booking Details:</h3>
      <ul>
        <li><strong>Booking code:</strong> ${bookingCode}</li>
        <li><strong>Room:</strong> ${roomName}</li>
        <li><strong>Guest name:</strong> ${guestName}</li>
        <li><strong>Guest email:</strong> ${guestEmail}</li>
        <li><strong>Check-in:</strong> ${formatDate(checkInDate)}</li>
        <li><strong>Check-out:</strong> ${formatDate(checkOutDate)}</li>
        <li><strong>Number of nights:</strong> ${numberOfNights}</li>
        <li><strong>Total price:</strong> ₦${totalPrice.toLocaleString()}</li>
        <li><strong>Payment method:</strong> ${paymentMethod === "pay_now" ? "Pay Now (Online)" : "Pay on Arrival"}</li>
        <li><strong>Payment status:</strong> <span style="color: ${paymentStatus === "completed" ? "green" : "blue"}; font-weight: bold;">${paymentStatus === "completed" ? "PAID" : "PENDING"}</span></li>
      </ul>
      <p style="margin-top: 20px; color:#666; font-size:14px;">
        Please log in to your dashboard to manage this booking.
      </p>
      <p style="margin-top:24px; color:#6b6b6b; font-size:14px;">Jiss Apartment Management System</p>
    </div>
  `;

    const result = await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: adminEmail,
      subject,
      html,
    });
    console.log(
      `[EMAIL SUCCESS] Admin notification sent to ${adminEmail} (Message ID: ${result.messageId})`,
    );
    return {
      success: true,
      message: "Admin notification sent successfully",
      messageId: result.messageId,
    };
  } catch (error) {
    console.error(
      `[EMAIL SEND ERROR] Failed to send admin notification for booking ${bookingCode}. Error: ${error.message}`,
    );
    return { success: false, error: error.message };
  }
};

module.exports = sendAdminNotification;
