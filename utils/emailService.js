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

const sendBookingConfirmationEmail = async ({
  to,
  name,
  bookingCode,
  roomName,
  checkInDate,
  checkOutDate,
  numberOfNights,
  totalPrice,
  paymentMethod,
}) => {
  const transporter = createTransporter();

  if (!transporter) {
    return;
  }

  const subject = `Booking confirmation for ${roomName}`;
  const html = `
    <div style="font-family: Arial, sans-serif; line-height:1.5; color:#111">
      <h2 style="color:#8b5e3c;">Booking confirmed</h2>
      <p>Hi ${name || "Guest"},</p>
      <p>Thank you for booking with us. Below are your reservation details:</p>
      <ul>
        <li><strong>Booking code:</strong> ${bookingCode}</li>
        <li><strong>Room:</strong> ${roomName}</li>
        <li><strong>Check-in:</strong> ${formatDate(checkInDate)}</li>
        <li><strong>Check-out:</strong> ${formatDate(checkOutDate)}</li>
        <li><strong>Number of nights:</strong> ${numberOfNights}</li>
        <li><strong>Total price:</strong> ₦${totalPrice.toLocaleString()}</li>
        <li><strong>Payment option:</strong> ${paymentMethod === "pay_now" ? "Pay Now" : "Pay on Arrival"}</li>
      </ul>
      <p>
        Please keep this email for your records. Your booking code is required for any
        future support or reference.
      </p>
      <p>We look forward to welcoming you.</p>
      <p style="margin-top:24px; color:#6b6b6b; font-size:14px;">Jiss Apartment</p>
    </div>
  `;

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to,
    subject,
    html,
  });
};

module.exports = sendBookingConfirmationEmail;
