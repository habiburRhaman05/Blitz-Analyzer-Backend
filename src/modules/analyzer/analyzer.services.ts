import { pdfToText } from "pdf-ts"
import crypto from "crypto"
import { prisma } from "../../lib/prisma"


import {
  ATS_OPTIMIZATION_PROMPT,
  ATS_SYSTEM_PROMPT,
  JOB_MATCH_PROMPT
} from "./analyzer.prompt"

import {
  SaveAnalysisPayload,
} from "./analyzer.interface"
import { runLLM } from "./analyzer.utils"
import { AppError } from "../../utils/AppError"
import status from "http-status"


const parseResumeService = async (
  fileBuffer: Buffer
): Promise<string> => {

  const text = await pdfToText(fileBuffer)

  if (!text || text.length < 100) {
    throw new Error("Invalid resume content")
  }

  return text.replace(/\s+/g, " ").trim()
}


const resumeATSScan = async (resumeText: string,id:string) => {

  const result = await runLLM(
    ATS_SYSTEM_PROMPT,
    `Analyze resume: ${resumeText}`
  )

  return {
    id,
    ...result
  }
}





const saveAnalysisDetails = async (
  userId: string,
  payload: SaveAnalysisPayload
) => {

  await prisma.customerProfile.findUniqueOrThrow({
    where: { id: userId }
  })

  const analysisExist = await prisma.analysis.findUnique({
    where:{id:payload.result.id}
  })

  if(analysisExist){
    throw new AppError("Analysis Already Saved",status.BAD_REQUEST)
  }

  return prisma.analysis.create({
    data: {
    id:payload.result.id,
   analysisType: payload.analysisType,
      resumeText: payload.resumeText,
      result: payload.result || {},
      resumeUrl: "dummy-url",
      userId
    }
  })
}


const makeAtsFriendly = async (
  prevResumeText: string,
  userPrompt = "Make this resume ATS friendly with score between 80-95 and optimize formatting, keywords, and readability"
) => {
  const systemPrompt = ATS_OPTIMIZATION_PROMPT;

  const result = await runLLM(
    systemPrompt,
    `${userPrompt}\n\nResume:\n${prevResumeText}`
  );

  return result;
};

  const applyImprovement = async (
  prevResumeText: string,
  payload: any
) => {

  const { title, content } = payload

  const systemPrompt = `
You are a professional resume editor.

Apply the requested improvement to the resume.

Return JSON:

{
 "status":"success",
 "updated_resume":"string"
}
`

  const userPrompt = `
Improvement Title: ${title}

Content to apply:
${content.join(", ")}

Resume:
${prevResumeText}
`

  const result = await runLLM(systemPrompt, userPrompt)

  return result
}



const getAllAnalysis = async (userId: string) => {

  const analysis = await prisma.analysis.findMany({
    where: { userId: userId }, // Changed 'id' back to 'userId'
    orderBy: { createdAt: 'desc' } // Adding this prevents "jumping" records
  });

  return analysis
 
  
}
const deleteAnalysis = async (analysisId: string) => {
  const analysis = await prisma.analysis.delete({
    where: { id: analysisId }
  });
  return analysis
}
export const analyzerServices = {
  parseResumeService,

  resumeATSScan,
  saveAnalysisDetails,

  applyImprovement,
  makeAtsFriendly,
  getAllAnalysis,
  deleteAnalysis
};