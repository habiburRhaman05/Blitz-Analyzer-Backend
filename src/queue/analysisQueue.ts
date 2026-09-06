import { Queue } from "bullmq";
import { redis } from "../config/redis";

// Queue for AI-consuming work (ATS scan, job matcher, resume rewrite/improve),
// keeping Groq calls off the request thread.
export const analysisQueue = new Queue("analysisQueue", {
  connection: redis as any,
});
