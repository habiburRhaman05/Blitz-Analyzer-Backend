import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { analyzerServices } from "./analyzer.services";
import { sendAppError, sendError, sendSuccess } from "../../utils/apiResponse";
import { v7 as uuidv7 } from "uuid";
import { redis } from "../../config/redis";
import status from "http-status";
import { AnalysisType } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";
import { walletServices } from "../wallet/wallet.service";
import { CREDIT_COSTS } from "../wallet/wallet.constants";
import { logger } from "../../utils/logger";
import { analysisQueue } from "../../queue/analysisQueue";
import { ANALYSIS_JOBS, ANALYSIS_JOB_OPTIONS } from "./analyzer.constants";
import { AnalysisJobData } from "./analyzer.interface";



// 1️⃣ Upload + Parse Resume (no AI call, stays synchronous and free)

const parseResumeController = asyncHandler(async (req: Request, res: Response) => {


  if (!req.file) {
    return sendError(res, {
      message: "Resume file is required",
      statusCode: status.BAD_REQUEST
    });
  }

  const { analysisType,jobData } = req.body;


  if (!analysisType) {
    return sendError(res, {
      message: "analysisType is required",
      statusCode: status.BAD_REQUEST
    });
  }

  // convert pdf -> text
  const parseText = await analyzerServices.parseResumeService(req.file.buffer);

  const analysisId = uuidv7();

  const parseDoc = {
    id: analysisId,
    parseText,
    analysisType,
    jobData:analysisType === AnalysisType.JOB_MATCHER ? jobData : null,
    resumeFile: {
      filename: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size
    }
  };

  // store temporary parse data
  await redis.set(
    `resume:${analysisId}`,
    JSON.stringify(parseDoc),
    "EX",
    600   // 10 minutes
  );

  return sendSuccess(res, {
    message: "Resume parsed successfully",
    data: {
      analysisId,
      parseDoc
    },
    statusCode: status.CREATED
  });
});

// 2️⃣ Enqueue AI Analysis (ATS scan or job matcher), returns immediately

const completeAnalysesResumeResult = asyncHandler(async (req: Request, res: Response) => {

  const { id } = req.params;
  const userId = res.locals.user.id;
  const jobId = id as string;

  // findFirst, not findUnique: ownership must be checked alongside id
  const analysis = await prisma.analysis.findFirst({
    where: { id: jobId, userId }
  });

  if (analysis) {
    return sendSuccess(res, {
      message: "Analysis fetched from db",
      data: analysis
    });
  }

  const cachedResult = await redis.get(`analysis-result:${jobId}`);

  if (cachedResult) {
    return sendSuccess(res, {
      message: "Analysis fetched from cache",
      data: JSON.parse(cachedResult)
    });
  }

  // same jobId is reused across retries of this endpoint, so a job still
  // in the queue means "already processing", not "start another one"
  const existingJob = await analysisQueue.getJob(jobId);
  if (existingJob) {
    return sendSuccess(res, {
      message: "Analysis is already processing",
      data: { status: "processing", jobId },
      statusCode: status.ACCEPTED
    });
  }

  const cacheData = await redis.get(`resume:${jobId}`);

  if (!cacheData) {
    return sendError(res, {
      message: "Analysis expired or not found",
      statusCode: status.NOT_FOUND
    });
  }

  const { parseText, analysisType, jobData } = JSON.parse(cacheData);

  const creditCost = analysisType === AnalysisType.JOB_MATCHER
    ? CREDIT_COSTS.JOB_MATCHER
    : CREDIT_COSTS.ATS_SCAN;

  try {
    // deduct before enqueueing, so we never run an AI job we won't get paid for
    await walletServices.deductCredits(userId, creditCost, {
      reason: `analysis:${analysisType}`,
      referenceId: jobId
    });
  } catch (err) {
    return sendAppError(res, err);
  }

  const jobName = analysisType === AnalysisType.JOB_MATCHER
    ? ANALYSIS_JOBS.JOB_MATCHER
    : ANALYSIS_JOBS.ATS_SCAN;

  await analysisQueue.add(
    jobName,
    { userId, jobId, creditCost, parseText, jobData } satisfies AnalysisJobData,
    { jobId, ...ANALYSIS_JOB_OPTIONS }
  );

  logger.info({ analysisId: jobId, analysisType, userId }, "Analysis job enqueued");

  return sendSuccess(res, {
    message: "Analysis is processing",
    data: { status: "processing", jobId },
    statusCode: status.ACCEPTED
  });
});

// Poll for the result of any analysisQueue job (ATS scan, job matcher,
// ATS optimize, or resume improve), keyed by the same jobId returned above.

const getJobStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  const cachedResult = await redis.get(`analysis-result:${id}`);
  if (cachedResult) {
    return sendSuccess(res, {
      message: "Analysis completed",
      data: { status: "completed", result: JSON.parse(cachedResult) }
    });
  }

  const failure = await redis.get(`analysis-failed:${id}`);
  if (failure) {
    return sendSuccess(res, {
      message: "Analysis failed",
      data: { status: "failed", ...JSON.parse(failure) }
    });
  }

  const job = await analysisQueue.getJob(id as string);
  if (job) {
    return sendSuccess(res, {
      message: "Analysis is processing",
      data: { status: "processing" }
    });
  }

  return sendError(res, {
    message: "No job found for this id",
    statusCode: status.NOT_FOUND
  });
});



// 3️⃣ Save Analysis History

const saveAnalysisController = asyncHandler(async (req: Request, res: Response) => {

  const { id } = req.params;

  const userId = res.locals.user?.id; // assuming auth middleware

  if (!userId) {
    return sendError(res, {
      message: "Unauthorized",
      statusCode: status.UNAUTHORIZED
    });
  }

  const resultKey = `analysis-result:${id}`;
  const parseKey = `resume:${id}`;

  const resultCache = await redis.get(resultKey);
  const parseCache = await redis.get(parseKey);
   const analysis = await prisma.analysis.findUnique({
    where:{id:id as string}
   })
    if(analysis) {
     return sendError(res, {
      message: "Analysis already  saved",
      statusCode: status.BAD_REQUEST
    });
   }
  if (!resultCache || !parseCache) {
    return sendError(res, {
      message: "Analysis data expired",
      statusCode: status.BAD_REQUEST
    });
  }

  const result = JSON.parse(resultCache);
  const parsed = JSON.parse(parseCache);

  const newAnalysis = await analyzerServices.saveAnalysisDetails(
    userId,
    {
      analysisType: parsed.analysisType,
      resumeText: parsed.parseText,
      result,
      id:result.id
    }
  );

  logger.info({ analysisId: newAnalysis.id, userId }, "Analysis saved");

  return sendSuccess(res, {
    message: "Analysis saved successfully",
    data: newAnalysis,
    statusCode: status.CREATED
  });
});



// 4️⃣ Enqueue ATS Resume Optimization

const makeAtsFriendlyController = asyncHandler(async (req: Request, res: Response) => {

  const { resumeText, prompt } = req.body;

  if (!resumeText) {
    return sendError(res, {
      message: "resumeText required",
      statusCode: status.BAD_REQUEST
    });
  }

  const userId = res.locals.user.id;
  const jobId = uuidv7();

  try {
    await walletServices.deductCredits(userId, CREDIT_COSTS.ATS_OPTIMIZE, {
      reason: "resume:ats_optimize",
      referenceId: jobId
    });
  } catch (err) {
    return sendAppError(res, err);
  }

  await analysisQueue.add(
    ANALYSIS_JOBS.ATS_OPTIMIZE,
    { userId, jobId, creditCost: CREDIT_COSTS.ATS_OPTIMIZE, resumeText, prompt } satisfies AnalysisJobData,
    { jobId, ...ANALYSIS_JOB_OPTIONS }
  );

  return sendSuccess(res, {
    message: "Resume optimization is processing",
    data: { status: "processing", jobId },
    statusCode: status.ACCEPTED
  });
});



// 5️⃣ Enqueue Resume Improvement

const applyImprovementController = asyncHandler(async (req: Request, res: Response) => {

  const { resumeText, title, content } = req.body;

  if (!resumeText || !title) {
    return sendError(res, {
      message: "Invalid request payload",
      statusCode: status.BAD_REQUEST
    });
  }

  const userId = res.locals.user.id;
  const jobId = uuidv7();

  try {
    await walletServices.deductCredits(userId, CREDIT_COSTS.RESUME_IMPROVE, {
      reason: "resume:improve",
      referenceId: jobId
    });
  } catch (err) {
    return sendAppError(res, err);
  }

  await analysisQueue.add(
    ANALYSIS_JOBS.RESUME_IMPROVE,
    { userId, jobId, creditCost: CREDIT_COSTS.RESUME_IMPROVE, resumeText, title, content } satisfies AnalysisJobData,
    { jobId, ...ANALYSIS_JOB_OPTIONS }
  );

  return sendSuccess(res, {
    message: "Improvement is processing",
    data: { status: "processing", jobId },
    statusCode: status.ACCEPTED
  });
});



const getAllAnalysisHistory = asyncHandler(async(req,res)=>{
  const userId = res.locals.user.id;
  const result = await analyzerServices.getAllAnalysis(userId);
  return sendSuccess(res,{
    data:result,

    message:"Fetch analysis history successfully"
  })
})
const deleteAnalysis = asyncHandler(async (req, res) => {
  const analysisId = req.params.id as string;
  const userId = res.locals.user.id;

  const result = await analyzerServices.deleteAnalysis(analysisId, userId);

  return sendSuccess(res, {
    data: result,
    message: "delete analysis history successfully"
  });
});

const generateAnalysisReport = asyncHandler(async (req, res) => {
  const analysisId = req.params.id as string;
  const userId = res.locals.user.id;

  const result = await analyzerServices.generateReportHandler(analysisId, userId);

  return sendSuccess(res, {
    data: result,
    message: "Your Analysis Report Generated successfully"
  });
});


// Enqueue direct job-matching (upload + match in one request, no prior parse step)

const jobMatcherController = asyncHandler(async (req, res) => {
  if (!req.file) {
    return sendError(res, {
      message: "Resume file is required",
      statusCode: status.BAD_REQUEST
    });
  }

  const userId = res.locals.user.id;
  const { jobData } = req.body;
  const jobId = uuidv7();

  try {
    await walletServices.deductCredits(userId, CREDIT_COSTS.JOB_MATCHER, {
      reason: "analysis:JOB_MATCHER_DIRECT",
      referenceId: jobId
    });
  } catch (err) {
    return sendAppError(res, err);
  }

  const parseText = await analyzerServices.parseResumeService(req.file.buffer);

  await analysisQueue.add(
    ANALYSIS_JOBS.JOB_MATCHER_DIRECT,
    { userId, jobId, creditCost: CREDIT_COSTS.JOB_MATCHER, parseText, jobData } satisfies AnalysisJobData,
    { jobId, ...ANALYSIS_JOB_OPTIONS }
  );

  return sendSuccess(res, {
    data: { status: "processing", jobId },
    message: "Your job matching report is processing",
    statusCode: status.ACCEPTED
  });
});

export const analyzerControllers = {
  parseResumeController,
  completeAnalysesResumeResult,
  getJobStatus,
  saveAnalysisController,
  makeAtsFriendlyController,
  applyImprovementController,
  getAllAnalysisHistory,
  deleteAnalysis,
  generateAnalysisReport,
  jobMatcherController
};
