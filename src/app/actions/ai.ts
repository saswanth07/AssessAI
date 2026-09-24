"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { z } from "zod"
import { generateQuestionsViaAI } from "@/lib/ai/service"
import { GenerateQuestionsParams, QuestionType, Difficulty } from "@/lib/ai/types"

const generateSchema = z.object({
  testId: z.string().min(1).max(100),
  topic: z.string().min(1, "Topic is required").max(200, "Topic too long"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  type: z.enum(["MCQ", "TRUE_FALSE"]),
  count: z.number().int().min(1).max(20),
})

export async function generateAIQuestionsAction(payload: z.infer<typeof generateSchema>) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "INSTRUCTOR") {
      return { success: false, error: "Unauthorized" }
    }

    const parsed = generateSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, error: "Invalid generation parameters" }
    }

    const { testId, topic, difficulty, type, count } = parsed.data

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: { questions: { select: { question: true } } }
    })

    if (!test) {
      return { success: false, error: "Assessment not found" }
    }
    
    if (test.creatorId !== session.user.id) {
      return { success: false, error: "Unauthorized: You do not own this assessment" }
    }

    if (test.status !== "DRAFT") {
      return { success: false, error: "AI generation is only allowed for DRAFT assessments" }
    }

    const existingQuestionsContext = test.questions.map(q => q.question)

    const params: GenerateQuestionsParams = {
      topic,
      context: `${test.subject} - ${test.topic}`,
      difficulty: difficulty as Difficulty,
      type: type as QuestionType,
      count,
      existingQuestionsContext
    }

    const questions = await generateQuestionsViaAI(params)
    
    // Server-side duplicate filtering (extra layer of safety in case AI ignores instructions)
    const normalizedExisting = new Set(existingQuestionsContext.map(q => q.toLowerCase().trim().replace(/[^a-z0-9]/g, '')))
    
    const finalQuestions = questions.filter(q => {
      const norm = q.question.toLowerCase().trim().replace(/[^a-z0-9]/g, '')
      if (normalizedExisting.has(norm)) {
        console.warn("AI generated a duplicate question that was filtered out on the server:", q.question)
        return false // Skip duplicates
      }
      return true
    })

    if (finalQuestions.length === 0 && count > 0) {
       return { success: false, error: "AI generated questions that were all duplicates of existing questions. Please try a different topic or difficulty." }
    }

    return { success: true, questions: finalQuestions }

  } catch (err: any) {
    console.error("AI Generation Error:", err)
    return { success: false, error: err.message || "Failed to generate questions via AI" }
  }
}

const regenerateSchema = z.object({
  testId: z.string().min(1).max(100),
  topic: z.string().min(1, "Topic is required").max(200, "Topic too long"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  type: z.enum(["MCQ", "TRUE_FALSE"]),
  existingQuestionsContext: z.array(z.string().max(500)).max(100).optional()
})

export async function regenerateAIQuestionAction(payload: z.infer<typeof regenerateSchema>) {
  try {
    const session = await auth()
    if (!session || session.user.role !== "INSTRUCTOR") {
      return { success: false, error: "Unauthorized" }
    }

    const parsed = regenerateSchema.safeParse(payload)
    if (!parsed.success) {
      return { success: false, error: "Invalid regeneration parameters" }
    }

    const { testId, topic, difficulty, type, existingQuestionsContext } = parsed.data

    const test = await prisma.test.findUnique({
      where: { id: testId },
      select: { creatorId: true, status: true, subject: true, topic: true }
    })

    if (!test) return { success: false, error: "Assessment not found" }
    if (test.creatorId !== session.user.id) return { success: false, error: "Unauthorized" }
    if (test.status !== "DRAFT") return { success: false, error: "AI generation is only allowed for DRAFT assessments" }

    const params: GenerateQuestionsParams = {
      topic,
      context: `${test.subject} - ${test.topic}`,
      difficulty: difficulty as Difficulty,
      type: type as QuestionType,
      count: 1,
      existingQuestionsContext: existingQuestionsContext || []
    }

    const questions = await generateQuestionsViaAI(params)
    
    if (questions.length === 0) {
      return { success: false, error: "Failed to regenerate a unique question." }
    }

    return { success: true, question: questions[0] }

  } catch (err: any) {
    console.error("AI Regeneration Error:", err)
    return { success: false, error: err.message || "Failed to regenerate question" }
  }
}
