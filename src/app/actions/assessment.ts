"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { z } from "zod"

// Validation Schemas
const createSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subject: z.string().min(2, "Subject is required"),
  topic: z.string().min(2, "Topic is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  duration: z.number().min(1, "Duration must be at least 1 minute")
})

const questionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Question text is required"),
  type: z.enum(["MCQ", "TRUE_FALSE"]),
  options: z.array(z.string().min(1, "Option cannot be empty")),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  topic: z.string().min(1, "Topic is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  explanation: z.string().optional(),
  order: z.number().int()
}).superRefine((data, ctx) => {
  if (data.type === "MCQ") {
    if (data.options.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MCQ must have at least 2 options", path: ["options"] })
    }
    if (!data.options.includes(data.correctAnswer)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Correct answer must be one of the options", path: ["correctAnswer"] })
    }
  } else if (data.type === "TRUE_FALSE") {
    if (data.correctAnswer !== "True" && data.correctAnswer !== "False") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "True/False correct answer must be 'True' or 'False'", path: ["correctAnswer"] })
    }
  }
})

const saveQuestionsSchema = z.array(questionSchema)

// Helpers
async function getInstructorSession() {
  const session = await auth()
  if (!session || session.user.role !== "INSTRUCTOR") {
    throw new Error("Unauthorized: Must be logged in as an INSTRUCTOR")
  }
  return session.user
}

async function verifyOwnership(testId: string, instructorId: string) {
  const test = await prisma.test.findUnique({ where: { id: testId } })
  if (!test) throw new Error("Assessment not found")
  if (test.creatorId !== instructorId) throw new Error("Unauthorized: You do not own this assessment")
  return test
}

export async function createAssessment(data: z.infer<typeof createSchema>) {
  const user = await getInstructorSession()
  const validated = createSchema.parse(data)

  const test = await prisma.test.create({
    data: {
      ...validated,
      creatorId: user.id,
      status: "DRAFT"
    }
  })

  revalidatePath("/instructor/tests")
  return { success: true, id: test.id }
}

export async function updateAssessment(id: string, data: z.infer<typeof createSchema>) {
  const user = await getInstructorSession()
  await verifyOwnership(id, user.id)
  const validated = createSchema.parse(data)

  await prisma.test.update({
    where: { id },
    data: validated
  })

  revalidatePath(`/instructor/tests/${id}/edit`)
  return { success: true }
}

export async function saveQuestions(testId: string, questionsData: z.infer<typeof saveQuestionsSchema>) {
  const user = await getInstructorSession()
  const test = await verifyOwnership(testId, user.id)

  if (test.status !== "DRAFT") {
    throw new Error("Can only modify questions while assessment is in DRAFT status")
  }

  const validatedQuestions = saveQuestionsSchema.parse(questionsData)

  // Use a transaction for atomic bulk update
  await prisma.$transaction(async (tx) => {
    // 1. Get existing questions to know what to delete
    const existing = await tx.question.findMany({ where: { testId } })
    const incomingIds = validatedQuestions.map(q => q.id).filter(id => id) as string[]
    
    const toDelete = existing.filter(q => !incomingIds.includes(q.id)).map(q => q.id)
    
    // 2. Delete removed questions
    if (toDelete.length > 0) {
      await tx.question.deleteMany({
        where: { id: { in: toDelete }, testId }
      })
    }

    // 3. Upsert incoming questions
    for (const q of validatedQuestions) {
      if (q.id) {
        // Update
        await tx.question.update({
          where: { id: q.id },
          data: {
            question: q.question,
            type: q.type,
            options: JSON.stringify(q.options), // SQLite string
            correctAnswer: q.correctAnswer,
            topic: q.topic,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
            order: q.order
          }
        })
      } else {
        // Create
        await tx.question.create({
          data: {
            testId,
            question: q.question,
            type: q.type,
            options: JSON.stringify(q.options),
            correctAnswer: q.correctAnswer,
            topic: q.topic,
            difficulty: q.difficulty,
            explanation: q.explanation || null,
            order: q.order
          }
        })
      }
    }
  }, { timeout: 30000, maxWait: 10000 })

  revalidatePath(`/instructor/tests/${testId}/edit`)
  return { success: true }
}

export async function publishAssessment(testId: string) {
  try {
    const user = await getInstructorSession()
    const test = await verifyOwnership(testId, user.id)

    if (test.status !== "DRAFT") {
      return { success: false, error: "Only DRAFT assessments can be published" }
    }

    // Validate publish requirements
    const questions = await prisma.question.findMany({ where: { testId } })
    if (questions.length === 0) {
      return { success: false, error: "Cannot publish an assessment with zero questions. Did you forget to click 'Save Draft'?" }
    }

    if (!test.title || !test.subject || !test.topic || test.duration < 1) {
      return { success: false, error: "Missing required basic information (title, subject, topic, duration)" }
    }

    for (const q of questions) {
      if (!q.question || !q.correctAnswer || !q.topic || !q.difficulty) {
        return { success: false, error: `Question (ID: ${q.id}) is missing required fields` }
      }
      const options = JSON.parse(q.options)
      if (q.type === "MCQ") {
        if (!Array.isArray(options) || options.length < 2) return { success: false, error: `MCQ (ID: ${q.id}) must have at least 2 options` }
        if (!options.includes(q.correctAnswer)) return { success: false, error: `MCQ (ID: ${q.id}) correct answer must be one of its options` }
      }
    }

    await prisma.test.update({
      where: { id: testId },
      data: { status: "OPEN" }
    })

    revalidatePath(`/instructor/tests`)
    revalidatePath(`/instructor/dashboard`)
    revalidatePath(`/student/dashboard`)
    return { success: true }
  } catch (error: any) {
    console.error("PUBLISH ERROR:", error)
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}

export async function closeAssessment(testId: string) {
  try {
    const user = await getInstructorSession()
    const test = await verifyOwnership(testId, user.id)

    if (test.status !== "OPEN") {
      return { success: false, error: "Only OPEN assessments can be closed" }
    }

    await prisma.test.update({
      where: { id: testId },
      data: { status: "CLOSED" }
    })

    revalidatePath(`/instructor/tests`)
    revalidatePath(`/student/dashboard`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}

export async function archiveAssessment(testId: string) {
  try {
    const user = await getInstructorSession()
    const test = await verifyOwnership(testId, user.id)

    if (test.status !== "CLOSED") {
      return { success: false, error: "Only CLOSED assessments can be archived" }
    }

    await prisma.test.update({
      where: { id: testId },
      data: { status: "ARCHIVED" }
    })

    revalidatePath(`/instructor/tests`)
    return { success: true }
  } catch (error: any) {
    return { success: false, error: error.message || "An unexpected error occurred" }
  }
}
