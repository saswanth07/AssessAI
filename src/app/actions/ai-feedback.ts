"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { generatePerformanceFeedbackViaAI } from "@/lib/ai/service"
import { aiPerformanceFeedbackSchema, AIPerformanceFeedback, PerformanceFeedbackParams } from "@/lib/ai/types"
import { revalidatePath } from "next/cache"

async function getStudentSession() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "STUDENT") {
    throw new Error("Unauthorized: Must be logged in as a STUDENT")
  }
  return session.user
}

/**
 * Retrieve existing AI feedback for a result (if already generated).
 * Student can only access their own result's feedback.
 */
export async function getAIFeedback(resultId: string): Promise<{
  success: boolean
  feedback?: AIPerformanceFeedback
  error?: string
  hasFeedback?: boolean
}> {
  try {
    const user = await getStudentSession()

    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        attempt: {
          select: { studentId: true }
        }
      }
    })

    if (!result) {
      return { success: false, error: "Result not found" }
    }

    // Security: only the student who owns the attempt can view feedback
    if (result.attempt.studentId !== user.id) {
      return { success: false, error: "Unauthorized: You do not have permission to view this feedback" }
    }

    if (!result.aiFeedback) {
      return { success: true, hasFeedback: false }
    }

    let parsed: AIPerformanceFeedback
    try {
      const raw = JSON.parse(result.aiFeedback)
      const validated = aiPerformanceFeedbackSchema.safeParse(raw)
      if (!validated.success) {
        // Stored data is malformed — treat as no feedback
        return { success: true, hasFeedback: false }
      }
      parsed = validated.data
    } catch {
      return { success: true, hasFeedback: false }
    }

    return { success: true, hasFeedback: true, feedback: parsed }
  } catch (error: any) {
    console.error("getAIFeedback error:", error)
    return { success: false, error: error.message || "Failed to retrieve feedback" }
  }
}

/**
 * Generate (or regenerate) AI performance feedback for a completed result.
 * Only the student who owns the result can request feedback.
 * Uses trusted Phase 5 result data — never modifies score/percentage/counts.
 */
export async function generatePerformanceFeedback(resultId: string, forceRegenerate = false): Promise<{
  success: boolean
  feedback?: AIPerformanceFeedback
  error?: string
  alreadyExists?: boolean
}> {
  try {
    const user = await getStudentSession()

    // 1. Load the result and verify ownership
    const result = await prisma.result.findUnique({
      where: { id: resultId },
      include: {
        attempt: {
          include: {
            test: {
              select: {
                title: true,
                subject: true,
                topic: true
              }
            },
            student: {
              select: { id: true }
            }
          }
        }
      }
    })

    if (!result) {
      return { success: false, error: "Result not found" }
    }

    // Security: only the student who owns the attempt can generate feedback
    if (result.attempt.student.id !== user.id) {
      return { success: false, error: "Unauthorized: You do not have permission to generate feedback for this result" }
    }

    // 2. If feedback already exists and not forcing regeneration, return existing
    if (result.aiFeedback && !forceRegenerate) {
      try {
        const raw = JSON.parse(result.aiFeedback)
        const validated = aiPerformanceFeedbackSchema.safeParse(raw)
        if (validated.success) {
          return { success: true, feedback: validated.data, alreadyExists: true }
        }
        // If stored feedback is invalid, fall through to regenerate
      } catch {
        // Fall through to regenerate
      }
    }

    // 3. Build minimal, trusted AI input from Phase 5 result data
    let topicPerformance: Array<{ topic: string; correct: number; total: number; percentage: number }> = []
    if (result.topicPerformance) {
      try {
        topicPerformance = JSON.parse(result.topicPerformance)
      } catch {
        topicPerformance = []
      }
    }

    const feedbackParams: PerformanceFeedbackParams = {
      assessmentTitle: result.attempt.test.title,
      subject: result.attempt.test.subject,
      overallPercentage: result.percentage,
      correctCount: result.correctCount,
      incorrectCount: result.incorrectCount,
      unansweredCount: result.unansweredCount,
      timeTakenSeconds: result.timeTakenSeconds,
      topicPerformance
    }

    // 4. Call AI service (server-side only)
    const rawFeedback = await generatePerformanceFeedbackViaAI(feedbackParams)

    // 5. Validate AI output with Zod before persisting
    const validation = aiPerformanceFeedbackSchema.safeParse(rawFeedback)
    if (!validation.success) {
      console.error("AI feedback Zod validation failed:", validation.error.flatten())
      return {
        success: false,
        error: "AI returned an invalid response. Please try again."
      }
    }

    const validatedFeedback = validation.data

    // 6. Persist validated feedback to the Result record
    // IMPORTANT: Only update aiFeedback — never touch score, percentage, counts, or topicPerformance
    await prisma.result.update({
      where: { id: resultId },
      data: {
        aiFeedback: JSON.stringify(validatedFeedback)
      }
    })

    revalidatePath(`/student/tests`)

    return { success: true, feedback: validatedFeedback }
  } catch (error: any) {
    console.error("generatePerformanceFeedback error:", error)
    return {
      success: false,
      error: error.message?.includes("API")
        ? "AI service is temporarily unavailable. Please try again later."
        : error.message || "Failed to generate AI feedback"
    }
  }
}
