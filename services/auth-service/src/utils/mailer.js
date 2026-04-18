import nodemailer from 'nodemailer';
import { config } from '../config.js';

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure, // true for 465, false for other ports (like 587)
  auth: {
    user: config.smtp.user,
    pass: config.smtp.pass,
  },
});

/**
 * Sends a verification email to a newly registered user.
 * @param {string} toEmail - The recipient's email address
 * @param {string} token - The raw verification token
 * @param {string} name - The user's full name
 */
export async function sendVerificationEmail(toEmail, token, name) {
  // Assuming a NEXT.js frontend runs on localhost:3000
  const verificationLink = `http://localhost:3000/auth/verify?token=${token}&email=${encodeURIComponent(toEmail)}`;

  const mailOptions = {
    from: `"FairGig Verification" <${config.smtp.user}>`,
    to: toEmail,
    subject: 'FairGig – Verify Your Email Address',
    text: `Hello ${name},\n\nPlease verify your email address by clicking the link below:\n\n${verificationLink}\n\nIf you did not request this, please ignore this email.`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Welcome to FairGig, ${name}!</h2>
        <p>Please verify your email address to continue setting up your account.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationLink}" 
             style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Verify Email Address
          </a>
        </div>
        <p style="color: #666; font-size: 12px;">If you didn't create an account, you can safely ignore this email.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[mailer] Failed to send verification email:', err);
    // We do not throw — failing to send an email shouldn't crash the registration transaction.
    // In production, we'd queue this or log it to alerting.
  }
}
