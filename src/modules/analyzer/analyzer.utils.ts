import { Groq } from "groq-sdk"
import { envConfig } from "../../config/env"


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