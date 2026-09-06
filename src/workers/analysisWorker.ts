import { Worker, Job } from "bullmq";
import { redis } from "../config/redis";
import { logger } from "../utils/logger";
import { analyzerServices } from "../modules/analyzer/analyzer.services";
import { walletServices } from "../modules/wallet/wallet.service";
import { ANALYSIS_JOBS } from "../modules/analyzer/analyzer.constants";
import { AnalysisJobData } from "../modules/analyzer/analyzer.interface";

// Runs the actual Groq calls off the request thread. Concurrency caps how
// many run in parallel, throttling Groq usage centrally regardless of queue depth.
const analysisWorker = new Worker(
  "analysisQueue",
  async (job: Job<AnalysisJobData>) => {
    const { jobId, parseText, jobData, resumeText, prompt, title, content } = job.data;

    let result;

    switch (job.name) {
      case ANALYSIS_JOBS.ATS_SCAN:
        result = await analyzerServices.resumeATSScan(parseText!, jobId);
        break;
      case ANALYSIS_JOBS.JOB_MATCHER:
      case ANALYSIS_JOBS.JOB_MATCHER_DIRECT:
        result = await analyzerServices.jobMatcher(parseText!, jobData!);
        break;
      case ANALYSIS_JOBS.ATS_OPTIMIZE:
        result = await analyzerServices.makeAtsFriendly(resumeText!, prompt);
        break;
      case ANALYSIS_JOBS.RESUME_IMPROVE:
        result = await analyzerServices.applyImprovement(resumeText!, { title, content });
        break;
      default:
        throw new Error(`Unknown analysis job: ${job.name}`);
    }

    // written here, not in the "completed" event, so a cache-write failure
    // fails the job and gets retried instead of silently losing the result
    await redis.set(`analysis-result:${jobId}`, JSON.stringify(result), "EX", 600);

    return result;
  },
  {
    connection: redis as any,
    concurrency: 5,
  }
);

analysisWorker.on("completed", (job) => {
  logger.info({ jobId: job.data.jobId, jobName: job.name }, "Analysis job completed");
});

// Only refund once retries are exhausted, guarded against duplicate refunds
// inside refundCredits itself via the same jobId as referenceId.
analysisWorker.on("failed", async (job, err) => {
  if (!job) return;

  logger.error({ jobId: job.data.jobId, jobName: job.name, err: err.message }, "Analysis job failed");

  if (job.attemptsMade < (job.opts.attempts ?? 1)) return;

  await walletServices.refundCredits(job.data.userId, job.data.creditCost, {
    reason: `refund:${job.name}`,
    referenceId: job.data.jobId,
  });

  await redis.set(
    `analysis-failed:${job.data.jobId}`,
    JSON.stringify({ message: err.message }),
    "EX",
    600
  );
});

export default analysisWorker;
