import { z } from "zod";


// Parse Resume Validation

export const parseResumeSchema = z.object({
  analysisType: z.enum(["ats_scan", "job_match"], {
    required_error: "analysisType is required",
  }),
  jobData: z
    .string()
    .optional()
    .refine((val, ctx) => {
      // Required if analysisType is job_match
      if (ctx.parent.analysisType === "job_match" && !val) {
        return false;
      }
      return true;
    }, { message: "jobData is required for job_match analysisType" }),
});


// Complete Analysis Validation

export const completeAnalysisSchema = z.object({
  id: z.string().uuid({ message: "analysisId must be a valid UUID" }),
});


// Save Analysis Validation

export const saveAnalysisSchema = z.object({
  id: z.string().uuid({ message: "analysisId must be a valid UUID" }),
  analysisType: z.enum(["ats_scan", "job_match"], {
    required_error: "analysisType is required",
  }),
  resumeText: z.string({
    required_error: "resumeText is required",
  }),
  result: z.any({
    required_error: "result object is required",
  }),
  jobData: z
    .object({
      title: z.string(),
      description: z.string(),
      requirements: z.string(),
    })
    .optional(),
});

// -----------------------------
// Resume Improvement Validation
// -----------------------------
export const improvementSchema = z.object({
  resumeText: z.string({
    required_error: "resumeText is required",
  }),
  title: z.string({
    required_error: "title is required",
  }),
  content: z.array(z.string(), {
    required_error: "content must be an array",
  }),
});

// -----------------------------
// ATS Optimize Validation
// -----------------------------
export const atsOptimizeSchema = z.object({
  resumeText: z.string({
    required_error: "resumeText is required",
  }),
  prompt: z.string().optional(),
});

// -----------------------------
// Save Resume Validation

export const saveResumeSchema = z.object({
  name: z.string({ required_error: "Resume name is required" }),
  resumeUrl: z.string({ required_error: "resumeUrl is required" }),
  userId: z.string().uuid({ message: "userId is required" }),
});

