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
import { analyzeJobMatch, runLLM } from "./analyzer.utils"
import { AppError } from "../../utils/AppError"
import status from "http-status"
import { generateReport } from "../../utils/analysis"


const parseResumeService = async (
  fileBuffer: Buffer
): Promise<string> => {
try {
    const text = await pdfToText(fileBuffer)
  if (!text || text.length < 100) {
    throw new Error("Invalid resume content")
  }
  return text.replace(/\s+/g, " ").trim()
} catch (error) {
  throw new AppError("Failed to Parse Resume",400)
}
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
};

const jobMatcher = async (resumeText,jobData) =>{
  const result = await analyzeJobMatch(resumeText,JSON.parse(jobData));
  return result
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

  const result = await prisma.analysis.create({
    data: {
    id:payload.result.id,
   analysisType: payload.analysisType,
      resumeText: payload.resumeText,
      result: payload.result || {},
      resumeUrl:  "",
      userId
    }
  })

  return result
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
const deleteAnalysis = async (analysisId: string, userId: string) => {
  // deleteMany scopes the delete by ownership, no separate read needed
  const result = await prisma.analysis.deleteMany({
    where: { id: analysisId, userId }
  });

  if (result.count === 0) {
    throw new AppError("Analysis not found", status.NOT_FOUND);
  }

  return { id: analysisId };
}
const templateCodes = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blitz Analyzer ATS Report</title>

  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      background: #f9fafb;
      color: #111827;
      line-height: 1.6;
    }

    .container {
      max-width: 800px;
      margin: 40px auto;
      padding: 20px;
    }

    .header {
      text-align: center;
      background: #2563eb;
      color: white;
      padding: 20px;
      border-radius: 10px;
    }

    .header img {
      width: 120px;
      margin-bottom: 10px;
    }

    .title {
      font-size: 24px;
      font-weight: bold;
    }

    .section {
      background: #ffffff;
      padding: 20px;
      margin-top: 20px;
      border-radius: 10px;
      border: 1px solid #e5e7eb;
    }

    .section h2 {
      margin-top: 0;
      font-size: 18px;
      border-bottom: 1px solid #e5e7eb;
      padding-bottom: 5px;
    }

    .score {
      font-size: 32px;
      font-weight: bold;
      color: #2563eb;
      text-align: center;
      margin: 15px 0;
    }

    ul {
      padding-left: 18px;
    }

    li {
      margin-bottom: 6px;
    }

    .footer {
      text-align: center;
      font-size: 12px;
      color: #6b7280;
      margin-top: 40px;
      border-top: 1px solid #e5e7eb;
      padding-top: 15px;
    }
  </style>
</head>

<body>
  <div class="container">

    <!-- Brand -->
    <div class="header">
      <img src="https://res.cloudinary.com/drngnsgwy/image/upload/v1774239280/blitz-analyzer/images/logos/dark-logo_b9ypum.svg" />
      <div class="title">Blitz Analyzer</div>
      <div>ATS Resume Report</div>
    </div>

    <!-- Summary -->
    <div class="section">
      <h2>Overview</h2>
      <p>Status: <strong>{{data.status}}</strong></p>
      <p>Type: {{data.analysis_type}}</p>
      <div class="score">{{data.overall_score}} / 100</div>
      <p>{{data.summary}}</p>
    </div>

    <!-- Score Breakdown -->
    <div class="section">
      <h2>Score Breakdown</h2>
      <ul>
        {{#each data.score_breakdown}}
          <li><strong>{{@key}}:</strong> {{this}}</li>
        {{/each}}
      </ul>
    </div>

    <!-- Vitals -->
    {{#if data.vitals.length}}
    <div class="section">
      <h2>Evaluation</h2>
      {{#each data.vitals}}
        <p>
          <strong>{{category}}</strong> ({{score}}/10)<br/>
          {{notes}}
        </p>
      {{/each}}
    </div>
    {{/if}}

    <!-- Keywords -->
    {{#if data.keyword_cloud.top_keywords.length}}
    <div class="section">
      <h2>Top Keywords</h2>
      <ul>
        {{#each data.keyword_cloud.top_keywords}}
          <li>{{keyword}} ({{frequency}})</li>
        {{/each}}
      </ul>
    </div>
    {{/if}}

    <!-- Improvements -->
    {{#if data.critical_improvements.length}}
    <div class="section">
      <h2>Improvements</h2>
      {{#each data.critical_improvements}}
        <p>
          <strong>{{title}}</strong><br/>
          {{recommendation}}
        </p>
      {{/each}}
    </div>
    {{/if}}

    <!-- Footer -->
    <div class="footer">
      © 2026 Blitz Analyzer — Certified ATS Resume Report <br/>
      Generated for internal analysis use only.
    </div>

  </div>
</body>
</html>`;

const generateReportHandler = async (analysisId: string, userId: string) => {

  const analysis = await prisma.analysis.findFirst({
    where: {
      id: analysisId,
      userId
    }
  });

  if (!analysis) {
    throw new AppError("Analysis not found", status.NOT_FOUND);
  }

  if (!analysis.result) {
    throw new AppError("First Save the Analysis", status.BAD_REQUEST);
  }

  const reportPayload = {
    id:analysis.id,
    ...analysis.result
  }
  const result = await generateReport(reportPayload,templateCodes);

  await prisma.analysis.update({
    where:{id:analysis.id},
    data:{
     reportUrl:result
    }
  })

  return result



}



export const analyzerServices = {
  parseResumeService,

  resumeATSScan,
  saveAnalysisDetails,

  applyImprovement,
  makeAtsFriendly,
  getAllAnalysis,
  deleteAnalysis,
  generateReportHandler,
  jobMatcher
};