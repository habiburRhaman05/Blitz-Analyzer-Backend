import { AppError } from "./AppError";
import { mailTransport } from "./mailTransporter";

type MailType = 'verify-email' | 'reset-email' | 'prescription-email' | "payment-succces-email";

interface MailData {
    email: string;
    subject: string;
    type: MailType;
    html:any
}

async function sendMail(data: MailData) {
    console.log("sending email...");
    
    const {subject,email,html,type} = data
    try {
        const mailOptions = {
            from: '"PH-Health Care" <noreply@phhealth.com>',
            to: email,
            subject: subject,
            html: html || `no html provided by backend
            `
        };
        return await mailTransport.sendMail(mailOptions);
    } catch (error) {
        console.error("Mail Error:", error);
        throw new AppError("Failed to send mail", 400);
    }
}

export const mailServices = { sendMail };