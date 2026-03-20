import { AppError } from "./AppError";
import { mailTransport } from "./mailTransporter";

/**
 * Supported Mail Types (Strict)
 */
export type MailType =
  | "verify-email"
  | "reset-email"
  | "payment-success-email";

/**
 * Input Contract
 */
export interface SendMailOptions {
  to: string;
  subject: string;
  html: string;
  type: MailType;
}

/**
 * Core Mail Sender (Single Responsibility)
 */
export const sendMail = async ({
  to,
  subject,
  html,
}: SendMailOptions) => {
  try {
    if (!to) {
      throw new AppError("Recipient email is required", 400);
    }
    const mailOptions = {
      from: `"Blitz Analyzer" <noreply@blitzanalyzer.com>`,
      to,
      subject,
      html: html || "<p>No content provided</p>",
    };
    const result = await mailTransport.sendMail(mailOptions);
    return result;
  } catch (error) {
    console.error("❌ Mail Error:", error);
    throw new AppError("Failed to send email", 500);
  }
};