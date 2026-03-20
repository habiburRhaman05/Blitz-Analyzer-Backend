import { z } from "zod";


// Parse Resume Validation

export const parseResumeSchema = z.object({
  analysisType: z.enum(["ATS_SCAN"], {
    required_error: "analysisType is required",
  })
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

});
