const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, text, html }) => {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.error(
      "[EMAIL CONFIG ERROR] Missing EMAIL_USER or EMAIL_PASS environment variables. Email service is not configured.",
    );
    return { success: false, error: "Email service not configured" };
  }

  try {
    const transporter = nodemailer.createTransport({
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
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to,
      subject,
      text,
      html,
    };

    const result = await transporter.sendMail(mailOptions);
    console.log(
      `[EMAIL SUCCESS] Email sent to ${to} (Message ID: ${result.messageId})`,
    );
    return {
      success: true,
      message: "Email sent successfully",
      messageId: result.messageId,
    };
  } catch (error) {
    console.error(
      `[EMAIL SEND ERROR] Failed to send email to ${to}. Error: ${error.message}`,
    );
    return { success: false, error: error.message };
  }
};

module.exports = sendEmail;
