import ejs from "ejs";
import path from "path";
import { MailType, sendMail } from "./mailServices";
import bcrypt from "bcrypt";
export const EMAIL_CONFIG = {
  "payment-success": {
    template: "payment.ejs",
    subject: "Payment Receipt - Blitz Analyzer",
  },

  "verify-email": {
    template: "verify.ejs",
    subject: "Verify Your Email",
  },

  "reset-password": {
    template: "reset.ejs",
    subject: "Reset Your Password",
  },
} as const;

export type EmailJobName = keyof typeof EMAIL_CONFIG;



export const renderTemplate = async (
  templateName: string,
  data: Record<string, any>
) => {
  const templatePath = path.join(
    process.cwd(),
    "src/templates",
    templateName
  );

  return await ejs.renderFile(templatePath, data);
};

export const buildTemplateData = (
  jobName: string,
  data: any
): Record<string, any> => {
  const { user, url, ...rest } = data;

  // Auth-related emails
  if (jobName.includes("verify") || jobName.includes("reset")) {
    return data
  }

  // Default (payment, etc.)
  return data;
};

export const getRecipientEmail = (data: any) => {
  return data?.user?.email;
};






export const generateOTP = (length = 6): string => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

export const hashOTP = async (otp: string): Promise<string> => {
  return bcrypt.hash(otp, 10);
};

export const getExpiry = (minutes: number): Date => {
  return new Date(Date.now() + minutes * 60 * 1000);
};


interface EmailPayload {
  email: string;
  subject: string;
  html: string;
  type: MailType;
}

export const sendEmail = async ({
  email,
  subject,
  html,
  type,
}: EmailPayload) => {
  return await sendMail({
    to: email,
    subject,
    html,
    type,
  });
};