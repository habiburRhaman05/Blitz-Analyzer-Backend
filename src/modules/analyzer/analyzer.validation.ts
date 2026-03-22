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

