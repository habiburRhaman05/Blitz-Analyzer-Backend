import { Worker, Job } from "bullmq";
import { redis } from "../../../PH-HEALTH-CARE-PROJECT/src/config/redis";
import { mailServices } from "../../../PH-HEALTH-CARE-PROJECT/src/utils/mailServices";
import ejs from "ejs";
import path from "path";

/**
 * Mapping of job names to their respective templates and email subjects
 */
const EMAIL_CONFIG: Record<string, { template: string; subject: string }> = {
  "prescription-email": {
    template: "prescription-email.ejs",
    subject: "Your Prescription - PH Health Care",
  },
  "verification-mail": {
    template: "verify-email.ejs",
    subject: "Verify Your Email - PH Health Care",
  },
  "reset-password-mail": {
    template: "reset-password-email.ejs",
    subject: "Reset Your Password - PH Health Care",
  },
  "payment-succces": {
    template: "payment.ejs",
    subject: "Payment Receipt - PH Health Care",
  },
};

const emailWorker = new Worker(
  "emailQueue",
  async (job: Job) => {
    const config = EMAIL_CONFIG[job.name];

    if (!config) {
      console.warn(`No configuration found for job: ${job.name}`);
      return;
    }

    try {
      const { user, url, ...restData } = job.data;

      // Normalize data structure for different email types
      const templateData = job.name.includes("mail")
        ? { name: user?.name, verifyUrl: url, resetUrl: url, ...restData }
        : job.data;

      const templatePath = path.join(process.cwd(), "src/templates", config.template);

      // Render email content using EJS
      const html = await ejs.renderFile(templatePath, templateData);

      // Determine recipient: priority to user object, fallback to patientEmail
      const recipientEmail = user?.email || job.data.patientEmail;

      await mailServices.sendMail({
        email: recipientEmail,
        subject: config.subject,
        type: job.name as any,
        html: html,
      });

    } catch (error) {
      console.error(`Error processing [${job.name}]:`, error);
      throw error; // Rethrow to allow BullMQ retry logic
    }
  },
  { connection: redis }
);



// Lifecycle events
emailWorker.on("completed", (job) => console.log(`Job ${job.id} [${job.name}] completed`));
emailWorker.on("failed", (job, err) => console.error(`Job ${job?.id} [${job?.name}] failed:`, err));

export default emailWorker;