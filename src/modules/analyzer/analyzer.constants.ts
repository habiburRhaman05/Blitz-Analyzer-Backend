// Job names on analysisQueue, matched by analysisWorker's dispatch switch.
export const ANALYSIS_JOBS = {
  ATS_SCAN: "ATS_SCAN",
  JOB_MATCHER: "JOB_MATCHER",
  JOB_MATCHER_DIRECT: "JOB_MATCHER_DIRECT",
  ATS_OPTIMIZE: "ATS_OPTIMIZE",
  RESUME_IMPROVE: "RESUME_IMPROVE",
} as const;

export type AnalysisJobName = (typeof ANALYSIS_JOBS)[keyof typeof ANALYSIS_JOBS];

// Shared BullMQ options for every analysis job: retry with backoff, and
// clean up immediately since Redis (not the job record) is the source of
// truth for polling, this also frees the jobId for reuse on retry.
export const ANALYSIS_JOB_OPTIONS = {
  attempts: 3,
  backoff: { type: "exponential" as const, delay: 2000 },
  removeOnComplete: true,
  removeOnFail: true,
};
