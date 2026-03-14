import { Request, Response } from "express";
import { asyncHandler } from "../../utils/asyncHandler";
import { analyzerServices } from "./analyzer.services";
import { sendError, sendSuccess } from "../../utils/apiResponse";
import { v7 as uuidv7 } from "uuid";
import { redis } from "../../config/redis";
import status from "http-status";
import { AnalysisScalarFieldEnum } from "../../generated/prisma/internal/prismaNamespaceBrowser";
import { AnalysisType } from "../../generated/prisma/enums";
import { prisma } from "../../lib/prisma";



// 1️⃣ Upload + Parse Resume

const parseResumeController = asyncHandler(async (req: Request, res: Response) => {

  if (!req.file) {
    return sendError(res, {
      message: "Resume file is required",
      statusCode: status.BAD_REQUEST
    });
  }

  const { analysisType, jobData } = req.body;

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
    jobInfo: analysisType === "job_match" ? JSON.parse(jobData) : null,
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
      analysisId
    },
    statusCode: status.CREATED
  });
});



// 2️⃣ Complete AI Analysis

const completeAnalysesResumeResult = asyncHandler(async (req: Request, res: Response) => {

  const { id } = req.params;

  const redisKey = `resume:${id}`;
  const resultKey = `analysis-result:${id}`;

  // check if AI result already exists
  const cachedResult = await redis.get(resultKey);

  if (cachedResult) {
    return sendSuccess(res, {
      message: "Analysis fetched from cache",
      data: JSON.parse(cachedResult)
    });
  }

  const cacheData = await redis.get(redisKey);

  if (!cacheData) {
    return sendError(res, {
      message: "Analysis expired or not found",
      statusCode: status.NOT_FOUND
    });
  }

  const { parseText, jobInfo, analysisType } = JSON.parse(cacheData);

  let result;

  if (analysisType === AnalysisType.ATS_SCAN) {
    result = await analyzerServices.resumeATSScan(parseText,id as string);
  }

  if (analysisType ===  AnalysisType.JOB_MATCHER) {
    result = await analyzerServices.resumeJobMatcher({
      resumeText: parseText,
      jobInfo,
      id:id as string
    });
  }

  // cache AI result
  await redis.set(
    resultKey,
    JSON.stringify(result),
    "EX",
    600
  );

  return sendSuccess(res, {
    message: "Resume analysis completed",
    data: result
  });
});



// 3️⃣ Save Analysis History

const saveAnalysisController = asyncHandler(async (req: Request, res: Response) => {

  const { id } = req.params;

  const userId = res.locals.auth?.userId; // assuming auth middleware

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

  if (!resultCache || !parseCache) {
    return sendError(res, {
      message: "Analysis data expired",
      statusCode: status.BAD_REQUEST
    });
  }

  const result = JSON.parse(resultCache);
  const parsed = JSON.parse(parseCache);
console.log(result);

   const analysis = await prisma.analysis.findUnique({
    where:{id:result.id}
   })

   if(analysis) {
     return sendError(res, {
      message: "Analysis already  saved",
      statusCode: status.BAD_REQUEST
    });
   }

  const newAnalysis = await analyzerServices.saveAnalysisDetails(
    userId,
    {
      analysisType: parsed.analysisType,
      resumeText: parsed.parseText,
      jobData: parsed.jobInfo,
      result
    }
  );

  return sendSuccess(res, {
    message: "Analysis saved successfully",
    data: newAnalysis,
    statusCode: status.CREATED
  });
});



// 4️⃣ ATS Resume Optimization

const makeAtsFriendlyController = asyncHandler(async (req: Request, res: Response) => {

  const { resumeText, prompt } = req.body;

  if (!resumeText) {
    return sendError(res, {
      message: "resumeText required",
      statusCode: status.BAD_REQUEST
    });
  }

  const result = await analyzerServices.makeAtsFriendly(
    resumeText,
    prompt
  );

  return sendSuccess(res, {
    message: "Resume optimized successfully",
    data: result
  });
});



// 5️⃣ Apply Resume Improvements

const applyImprovementController = asyncHandler(async (req: Request, res: Response) => {

  const { resumeText, title, content } = req.body;

  if (!resumeText || !title) {
    return sendError(res, {
      message: "Invalid request payload",
      statusCode: status.BAD_REQUEST
    });
  }

  const result = await analyzerServices.applyImprovement(
    resumeText,
    { title, content }
  );

  return sendSuccess(res, {
    message: "Improvement applied successfully",
    data: result
  });
});



// 6️⃣ Save Generated Resume

const saveResumeController = asyncHandler(async (req: Request, res: Response) => {

  const userId = res.locals?.user.id;

  if (!userId) {
    return sendError(res, {
      message: "Unauthorized",
      statusCode: status.UNAUTHORIZED
    });
  }

  const { name, resumeUrl } = req.body;

  if (!name || !resumeUrl) {
    return sendError(res, {
      message: "name and resumeUrl required",
      statusCode: status.BAD_REQUEST
    });
  }

  const resume = await analyzerServices.saveResume({
    userId,
    name,
    resumeUrl
  });

  return sendSuccess(res, {
    message: "Resume saved successfully",
    data: resume,
    statusCode: status.CREATED
  });
});



// EXPORT

export const analyzerControllers = {
  parseResumeController,
  completeAnalysesResumeResult,
  saveAnalysisController,
  makeAtsFriendlyController,
  applyImprovementController,
  saveResumeController
};