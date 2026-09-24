import { GenerateQuestionsParams, GeneratedQuestion, PerformanceFeedbackParams, AIPerformanceFeedback } from "./types"
import { generateWithGemini, generatePerformanceFeedbackWithGemini } from "./providers/gemini"

export async function generateQuestionsViaAI(params: GenerateQuestionsParams): Promise<GeneratedQuestion[]> {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "gemini"

  switch (provider) {
    case "gemini":
      return await generateWithGemini(params)
    case "openai":
    case "grok":
    case "ollama":
      throw new Error(`AI Provider ${provider} is configured but not yet implemented.`)
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${provider}`)
  }
}

export async function generatePerformanceFeedbackViaAI(params: PerformanceFeedbackParams): Promise<AIPerformanceFeedback> {
  const provider = process.env.AI_PROVIDER?.toLowerCase() || "gemini"

  switch (provider) {
    case "gemini":
      return await generatePerformanceFeedbackWithGemini(params)
    case "openai":
    case "grok":
    case "ollama":
      throw new Error(`AI Provider ${provider} is configured but not yet implemented for performance feedback.`)
    default:
      throw new Error(`Unsupported AI_PROVIDER: ${provider}`)
  }
}
