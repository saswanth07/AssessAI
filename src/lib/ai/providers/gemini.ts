import { generateObject } from "ai"
import { createGoogleGenerativeAI } from "@ai-sdk/google"
import {
  GenerateQuestionsParams,
  generatedQuestionsSchema,
  PerformanceFeedbackParams,
  aiPerformanceFeedbackSchema,
  AIPerformanceFeedback
} from "../types"

export async function generateWithGemini(params: GenerateQuestionsParams) {
  // Initialize provider using env vars safely
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "",
  })

  // Determine schema constraint based on type requested
  const schema = generatedQuestionsSchema

  let prompt = `You are an expert educational assessment creator.
Create exactly ${params.count} ${params.type === "MCQ" ? "multiple-choice" : "true/false"} questions.
Topic: ${params.topic}
Subject Context: ${params.context}
Difficulty: ${params.difficulty}

Requirements:
- For MCQ, provide exactly 4 options and exactly one correctAnswer that perfectly matches one of the options.
- For TRUE_FALSE, the options MUST be exactly ["True", "False"] and the correctAnswer MUST be exactly "True" or "False".
- Provide a concise explanation for why the answer is correct.
- Avoid ambiguous wording.
- Incorrect options must be plausible but clearly incorrect.`

  if (params.existingQuestionsContext && params.existingQuestionsContext.length > 0) {
    prompt += `\n\nCRITICAL: DO NOT duplicate any of the following existing questions or create questions that are semantically identical:\n`
    params.existingQuestionsContext.forEach((eq, i) => {
      prompt += `${i + 1}. ${eq}\n`
    })
  }

  const { object } = await generateObject({
    model: google(process.env.AI_MODEL || "gemini-2.5-flash"),
    schema: schema,
    prompt: prompt,
  })

  return object.questions
}

export async function generatePerformanceFeedbackWithGemini(
  params: PerformanceFeedbackParams
): Promise<AIPerformanceFeedback> {
  const google = createGoogleGenerativeAI({
    apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY || process.env.GEMINI_API_KEY || process.env.AI_API_KEY || "",
  })

  // Categorize topics by performance threshold for richer context
  const strongTopics = params.topicPerformance.filter(t => t.percentage >= 80)
  const developingTopics = params.topicPerformance.filter(t => t.percentage >= 60 && t.percentage < 80)
  const weakTopics = params.topicPerformance.filter(t => t.percentage < 60)

  const topicSummary = params.topicPerformance.length > 0
    ? params.topicPerformance.map(t => {
        const level = t.percentage >= 80 ? "Strong" : t.percentage >= 60 ? "Developing" : "Needs Improvement"
        return `- ${t.topic}: ${t.correct}/${t.total} correct (${t.percentage}%) [${level}]`
      }).join("\n")
    : "No topic breakdown available."

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    return mins > 0 ? `${mins} minutes ${rem} seconds` : `${rem} seconds`
  }

  const systemPrompt = `You are an educational assessment feedback assistant. Your role is to analyze a student's assessment performance data and provide personalized, actionable, and encouraging feedback.

Rules you MUST follow:
1. Base your analysis ONLY on the supplied performance data. Do not invent facts.
2. Do NOT modify, recalculate, or contradict the official score or percentage.
3. Identify strengths from topics with >= 80% accuracy.
4. Identify improvement areas from topics with < 60% accuracy.
5. Provide specific, actionable study recommendations relevant to the subject and topics.
6. Keep the tone educational, encouraging, and professional.
7. Do NOT make psychological, medical, personality, or predictive claims.
8. Do NOT predict future exam success or make guarantees.
9. Keep recommendations specific to the supplied subject and topics.
10. Return ONLY the structured JSON schema — no extra commentary.`

  const userPrompt = `Assessment: ${params.assessmentTitle}
Subject: ${params.subject}

Official Performance Data (do not modify):
- Score: ${params.correctCount} out of ${params.correctCount + params.incorrectCount + params.unansweredCount}
- Percentage: ${params.overallPercentage}%
- Correct: ${params.correctCount}
- Incorrect: ${params.incorrectCount}
- Unanswered: ${params.unansweredCount}
- Time taken: ${formatTime(params.timeTakenSeconds)}

Topic-wise Performance:
${topicSummary}

Strong topics (>= 80%): ${strongTopics.map(t => t.topic).join(", ") || "None"}
Developing topics (60–79%): ${developingTopics.map(t => t.topic).join(", ") || "None"}
Topics needing improvement (< 60%): ${weakTopics.map(t => t.topic).join(", ") || "None"}

Generate personalized performance feedback following your instructions. Be specific and reference the actual topic percentages where appropriate.`

  const { object } = await generateObject({
    model: google(process.env.AI_MODEL || "gemini-2.5-flash"),
    schema: aiPerformanceFeedbackSchema,
    system: systemPrompt,
    prompt: userPrompt,
  })

  return object
}

