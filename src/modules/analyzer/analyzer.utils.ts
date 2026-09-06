import { Groq } from "groq-sdk"
import { envConfig } from "../../config/env"
import { logger } from "../../utils/logger"


const groq = new Groq({
  apiKey: envConfig.GROQ_API_KEY
})

export const runLLM = async (
  systemPrompt: string,
  userPrompt: string
) => {

  const completion:any = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt }
    ],
    temperature: 0.1,
    response_format: { type: "json_object" }
  })

  return JSON.parse(
    completion.choices[0].message.content || "{}"
  )
}


export const analyzeJobMatch = async (resumeText: string, jobData: { title: string; description: string }) => {
  logger.info({ jobTitle: jobData.title }, "Running job match analysis");

  const systemPrompt = `
You are an advanced ATS (Applicant Tracking System) and resume analysis engine.

Compare resume with job description and return structured insights.

Rules:
- Return ONLY JSON
- No extra text
- Be realistic
`;

const userPrompt = `
Resume: ${resumeText}
Job Title: ${jobData.title}
Job Description: ${jobData.description}

Return ONLY a JSON object with this exact structure:
{
  "match_percentage": number (0-100),
  "match_verdict": "string (e.g. Excellent Match)",
  "verdict_description": "string (long summary)",
  "strategic_advice": {
    "resume_tweak": "string",
    "interview_focus": "string",
    "custom_pitch": "string"
  },
  "requirement_mapping": [
    {
      "requirement": "string",
      "status": "MATCHED" | "PARTIAL" | "MISSING",
      "evidence": "string"
    }
  ],
  "top_skill_gaps": ["string", "string"]
}
`;



  return await runLLM(systemPrompt, userPrompt);
};