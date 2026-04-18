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
  // Use configurable frontend URL
  const verificationLink = `${config.frontend.baseUrl}/verify-email?token=${token}`;

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

/**
 * Sends a status update email when a verifier activates/deactivates a worker.
 * @param {string} toEmail - The worker's email address
 * @param {string} workerName - The worker's full name
 * @param {boolean} isActive - Updated active state
 * @param {string} updatedByName - Verifier/admin display name
 */
export async function sendWorkerStatusUpdateEmail(toEmail, workerName, isActive, updatedByName) {
  const statusLabel = isActive ? 'active' : 'inactive';
  const statusLine = isActive
    ? 'Your FairGig account has been activated and you can continue using the platform.'
    : 'Your FairGig account has been set to inactive. If this was unexpected, please contact support.';

  const mailOptions = {
    from: `"FairGig Support" <${config.smtp.user}>`,
    to: toEmail,
    subject: `FairGig - Account Status Updated (${statusLabel.toUpperCase()})`,
    text: `Hello ${workerName},\n\n${statusLine}\n\nUpdated by: ${updatedByName}\nStatus: ${statusLabel.toUpperCase()}\n\nThank you,\nFairGig Team`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 20px;">
        <h2>Account Status Updated</h2>
        <p>Hello ${workerName},</p>
        <p>${statusLine}</p>
        <div style="margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; background: #f9fafb;">
          <p style="margin: 0 0 6px 0;"><strong>Status:</strong> ${statusLabel.toUpperCase()}</p>
          <p style="margin: 0;"><strong>Updated by:</strong> ${updatedByName}</p>
        </div>
        <p style="color: #666; font-size: 12px;">If you think this is incorrect, please contact the FairGig support team.</p>
      </div>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
  } catch (err) {
    console.error('[mailer] Failed to send worker status update email:', err);
  }
}
