"use client";

import { pdfToText } from "pdf-ts";
import { IResumeJobMatcherPayload } from "./analyzer.interface";
import { Groq } from "groq-sdk";
import { envConfig } from "../../config/env";

const groq = new Groq({ apiKey: envConfig.GROQ_API_KEY});

/**
 * Extracts and cleans text from a PDF buffer
 */
const parseResumeService = async (fileBuffer: Buffer): Promise<string> => {
  console.log(envConfig.GROQ_API_KEY);
  
  const text = await pdfToText(fileBuffer);
  return text.replace(/\s+/g, ' ').trim();
};

/**
 * Performs a deep ATS (Applicant Tracking System) scan using LLM
 */

// imprve leter - add pdf cotent validation is text if formating like resume or not etc and many more
const resumeATSScan = async (resumeText: string) => {
  const systemPrompt = `
    You are an expert ATS (Applicant Tracking System) analyzer. 
    Analyze the provided resume text and return a detailed JSON report.
    
    The JSON must follow this exact structure:
    {
      "status": "success",
      "analysis_type": "ATS_SCAN",
      "overall_score": number (0-100),
      "summary": "string",
      "vitals": [
        { "label": "Formatting", "score": number, "status": "success" | "warning" | "error", "insight": "string" },
        { "label": "Readability", "score": number, "status": "success" | "warning" | "error", "insight": "string" },
        { "label": "Skill Density", "score": number, "status": "success" | "warning" | "error", "insight": "string" }
      ],
      "technical_audit": {
        "header_check": "PASS" | "FAIL",
        "section_structure": "PASS" | "FAIL",
        "font_compatibility": "PASS" | "FAIL",
        "tables_detected": "NONE" | "DETECTED"
      },
      "keyword_cloud": {
        "detected": ["string"],
        "missing_high_priority": ["string"]
      },
      "critical_improvements": [
        { "area": "string", "issue": "string", "fix": "string" }
      ]
    }
  `;

  const userPrompt = `Analyze this resume for ATS compatibility: ${resumeText}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
     model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }, // এটি ব্যবহার করলে প্রম্পটে 'json' থাকা বাধ্যতামূলক
      temperature: 0.1,
  });

  const result = JSON.parse(chatCompletion.choices[0].message.content || "{}");
  return {
    id: crypto.randomUUID(), // Dynamic ID generation
    ...result
  };
};

/**
 * Matches a resume against a specific job description
 */
const resumeJobMatcher = async ({ resumeText, jobInfo }: IResumeJobMatcherPayload) => {
  const systemPrompt = `
    You are a professional technical recruiter. 
    Compare the candidate's resume against the Job Title: "${jobInfo.title}", 
    Description: "${jobInfo.description}", and Requirements: "${jobInfo.requirements}".
    
    Return a JSON object with this exact structure:
    {
      "status": "success",
      "analysis_type": "JOB_MATCHER",
      "match_percentage": number (0-100),
      "match_verdict": "string (e.g., Strong Contender, Potential Fit, etc.)",
      "verdict_description": "string",
      "requirement_mapping": [
        { "requirement": "string", "status": "MATCHED" | "PARTIAL" | "MISSING", "evidence": "string" }
      ],
      "top_skill_gaps": ["string"],
      "strategic_advice": {
        "resume_tweak": "string",
        "interview_focus": "string",
        "custom_pitch": "string"
      }
    }
  `;

  const userPrompt = `Resume Content: ${resumeText}`;

  const chatCompletion = await groq.chat.completions.create({
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
      model: "llama-3.3-70b-versatile",
      response_format: { type: "json_object" }, // এটি ব্যবহার করলে প্রম্পটে 'json' থাকা বাধ্যতামূলক
      temperature: 0.1,
  });

  const result = JSON.parse(chatCompletion.choices[0].message.content || "{}");
  return {
    id: crypto.randomUUID(),
    ...result
  };
};

export const analyzerServices = {
  parseResumeService,
  resumeJobMatcher,
  resumeATSScan,
};