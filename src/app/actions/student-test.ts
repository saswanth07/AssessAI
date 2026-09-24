"use server"

import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"

// Helper to get authenticated student
async function getStudentSession() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "STUDENT") {
    throw new Error("Unauthorized: Must be logged in as a STUDENT")
  }
  return session.user
}

// Helper to get authenticated instructor
async function getInstructorSession() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "INSTRUCTOR") {
    throw new Error("Unauthorized: Must be logged in as an INSTRUCTOR")
  }
  return session.user
}

/**
 * Start or resume a test attempt.
 * Authoritative: creates or resumes attempt on server.
 */
export async function startOrResumeAttempt(testId: string) {
  try {
    const user = await getStudentSession()

    // 1. Verify test exists and is OPEN
    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        _count: { select: { questions: true } }
      }
    })

    if (!test) {
      return { success: false, error: "Assessment not found" }
    }

    if (test.status !== "OPEN") {
      return { success: false, error: "This assessment is not currently open for taking." }
    }

    if (test._count.questions === 0) {
      return { success: false, error: "This assessment does not have any questions yet." }
    }

    // 2. Check for existing attempt
    const existingAttempt = await prisma.testAttempt.findUnique({
      where: {
        studentId_testId: {
          studentId: user.id,
          testId: test.id
        }
      },
      include: {
        result: true
      }
    })

    if (existingAttempt) {
      // If already completed or submitted
      if (existingAttempt.status === "COMPLETED" || existingAttempt.result) {
        const ret = {
          success: true,
          attemptId: existingAttempt.id,
          testId: test.id,
          status: "COMPLETED"
        }
        console.log("[START_TEST_SERVER] RETURNING", ret)
        return ret
      }

      // If in progress, check if time has expired
      const startTimeMs = new Date(existingAttempt.startTime).getTime()
      const durationMs = test.duration * 60 * 1000
      const expirationMs = startTimeMs + durationMs

      if (Date.now() > expirationMs) {
        await internalEvaluateAndCompleteAttempt(existingAttempt.id)
        const ret = {
          success: true,
          attemptId: existingAttempt.id,
          testId: test.id,
          status: "COMPLETED"
        }
        console.log("[START_TEST_SERVER] RETURNING", ret)
        return ret
      }

      // Resume active attempt
      const ret = {
        success: true,
        attemptId: existingAttempt.id,
        testId: test.id,
        status: "IN_PROGRESS"
      }
      console.log("[START_TEST_SERVER] RETURNING", ret)
      return ret
    }

    // 3. Create new attempt
    const newAttempt = await prisma.testAttempt.create({
      data: {
        studentId: user.id,
        testId: test.id,
        startTime: new Date(),
        status: "IN_PROGRESS"
      }
    })

    const returnVal = {
      success: true,
      attemptId: newAttempt.id,
      testId: test.id,
      status: "IN_PROGRESS"
    }
    console.log("[START_TEST_SERVER] RETURNING", returnVal)
    return returnVal
  } catch (error: any) {
    console.error("[START_TEST_SERVER] ERROR", error)
    return { success: false, error: error.message || "Failed to start assessment" }
  }
}

/**
 * Load test details and safe question data (without correctAnswer or explanations) for test taking.
 */
export async function getTestForTaking(testId: string) {
  try {
    const user = await getStudentSession()

    const attempt = await prisma.testAttempt.findUnique({
      where: {
        studentId_testId: {
          studentId: user.id,
          testId: testId
        }
      },
      include: {
        test: {
          include: {
            questions: {
              orderBy: { order: "asc" }
            }
          }
        },
        answers: true,
        result: true
      }
    })

    if (!attempt) {
      return { success: false, error: "No active test attempt found. Please start the test from dashboard." }
    }

    if (attempt.status === "COMPLETED" || attempt.result) {
      return {
        success: false,
        isCompleted: true,
        attemptId: attempt.id,
        error: "This test attempt has already been completed."
      }
    }

    // Check expiration on server
    const startTimeMs = new Date(attempt.startTime).getTime()
    const durationMs = attempt.test.duration * 60 * 1000
    const expirationMs = startTimeMs + durationMs
    const nowMs = Date.now()

    if (nowMs >= expirationMs) {
      // Auto evaluate and complete (without revalidation during Server Component render)
      await internalEvaluateAndCompleteAttempt(attempt.id, undefined, false)
      return {
        success: false,
        isCompleted: true,
        isExpired: true,
        attemptId: attempt.id,
        error: "Assessment time limit has expired. Your test has been submitted."
      }
    }

    // Prepare safe questions: strictly strip correctAnswer and explanation
    const safeQuestions = attempt.test.questions.map((q) => {
      let parsedOptions: string[] = []
      try {
        parsedOptions = JSON.parse(q.options)
      } catch {
        parsedOptions = []
      }

      return {
        id: q.id,
        question: q.question,
        type: q.type,
        options: parsedOptions,
        topic: q.topic,
        difficulty: q.difficulty,
        order: q.order
      }
    })

    // Saved answers mapped by questionId
    const savedAnswers: Record<string, string> = {}
    for (const ans of attempt.answers) {
      if (ans.selectedOption !== null && ans.selectedOption !== undefined) {
        savedAnswers[ans.questionId] = ans.selectedOption
      }
    }

    return {
      success: true,
      attemptId: attempt.id,
      testId: attempt.test.id,
      title: attempt.test.title,
      subject: attempt.test.subject,
      topic: attempt.test.topic,
      durationMinutes: attempt.test.duration,
      startTime: attempt.startTime.toISOString(),
      serverExpiresAt: new Date(expirationMs).toISOString(),
      remainingSeconds: Math.max(0, Math.floor((expirationMs - nowMs) / 1000)),
      totalQuestions: safeQuestions.length,
      questions: safeQuestions,
      savedAnswers
    }
  } catch (error: any) {
    console.error("Get test error:", error)
    return { success: false, error: error.message || "Failed to load test" }
  }
}

/**
 * Save an individual answer during test taking.
 * Authoritative: checks ownership, active attempt status, question validity, and server expiration.
 */
export async function saveAnswer(attemptId: string, questionId: string, selectedOption: string | null) {
  try {
    const user = await getStudentSession()

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: { test: true }
    })

    if (!attempt || attempt.studentId !== user.id) {
      return { success: false, error: "Unauthorized or invalid attempt" }
    }

    if (attempt.status !== "IN_PROGRESS") {
      return { success: false, isCompleted: true, error: "Cannot save answer: attempt is already completed" }
    }

    // Verify question belongs to this test
    const question = await prisma.question.findFirst({
      where: {
        id: questionId,
        testId: attempt.testId
      }
    })

    if (!question) {
      return { success: false, error: "Invalid question for this assessment" }
    }

    // Check expiration with 10s network grace
    const startTimeMs = new Date(attempt.startTime).getTime()
    const durationMs = attempt.test.duration * 60 * 1000
    const expirationMs = startTimeMs + durationMs

    if (Date.now() > expirationMs + 10000) {
      await internalEvaluateAndCompleteAttempt(attempt.id)
      return { success: false, isExpired: true, error: "Time has expired. Test has been automatically submitted." }
    }

    // Atomic upsert of student answer
    await prisma.studentAnswer.upsert({
      where: {
        attemptId_questionId: {
          attemptId,
          questionId
        }
      },
      update: {
        selectedOption
      },
      create: {
        attemptId,
        questionId,
        selectedOption
      }
    })

    return { success: true }
  } catch (error: any) {
    console.error("Save answer error:", error)
    return { success: false, error: error.message || "Failed to save answer" }
  }
}

/**
 * Submit test attempt.
 * Strictly takes ONLY attemptId. Loads all answers and questions from DB.
 */
export async function submitTestAttempt(attemptId: string) {
  try {
    const user = await getStudentSession()
    return await internalEvaluateAndCompleteAttempt(attemptId, user.id)
  } catch (error: any) {
    console.error("Submit test error:", error)
    return { success: false, error: error.message || "Failed to submit test" }
  }
}

/**
 * Internal atomic evaluation and completion routine.
 * Handles duplicate submissions, expired attempts, and calculates all metrics server-side.
 *
 * IMPORTANT: revalidatePath must NOT be called inside prisma.$transaction().
 * The transaction returns the testId; cache revalidation happens after.
 */
async function internalEvaluateAndCompleteAttempt(attemptId: string, studentIdVerification?: string, shouldRevalidate: boolean = true) {
  const txResult = await prisma.$transaction(async (tx) => {
    // 1. Fetch attempt with test, questions, existing answers, and result
    const attempt = await tx.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            questions: {
              orderBy: { order: "asc" }
            }
          }
        },
        answers: true,
        result: true
      }
    })

    if (!attempt) {
      return { success: false, error: "Attempt not found" } as const
    }

    if (studentIdVerification && attempt.studentId !== studentIdVerification) {
      return { success: false, error: "Unauthorized: attempt belongs to a different student" } as const
    }

    // If already completed, return success idempotently
    if (attempt.status === "COMPLETED" || attempt.result) {
      return {
        success: true,
        attemptId: attempt.id,
        testId: attempt.testId,
        alreadyCompleted: true
      } as const
    }

    const questions = attempt.test.questions
    const totalQuestions = questions.length
    const studentAnswerMap = new Map(attempt.answers.map((a) => [a.questionId, a.selectedOption]))

    let correctCount = 0
    let incorrectCount = 0
    let unansweredCount = 0

    // Topic breakdown: { [topic]: { correct: number, total: number } }
    const topicStats: Record<string, { correct: number; total: number }> = {}

    // Evaluate each question against persisted student answer
    for (const q of questions) {
      const topicName = q.topic || attempt.test.topic || "General"
      if (!topicStats[topicName]) {
        topicStats[topicName] = { correct: 0, total: 0 }
      }
      topicStats[topicName].total += 1

      const selected = studentAnswerMap.get(q.id)

      if (!selected || selected.trim() === "") {
        // Unanswered
        unansweredCount += 1
        // Mark answer record as not correct if it exists
        if (studentAnswerMap.has(q.id)) {
          await tx.studentAnswer.update({
            where: {
              attemptId_questionId: {
                attemptId: attempt.id,
                questionId: q.id
              }
            },
            data: { isCorrect: false }
          })
        }
      } else {
        // Check if selected answer matches correct answer
        const isMatch = selected.trim().toLowerCase() === q.correctAnswer.trim().toLowerCase()

        if (isMatch) {
          correctCount += 1
          topicStats[topicName].correct += 1
        } else {
          incorrectCount += 1
        }

        // Update student answer record isCorrect
        await tx.studentAnswer.upsert({
          where: {
            attemptId_questionId: {
              attemptId: attempt.id,
              questionId: q.id
            }
          },
          update: {
            isCorrect: isMatch
          },
          create: {
            attemptId: attempt.id,
            questionId: q.id,
            selectedOption: selected,
            isCorrect: isMatch
          }
        })
      }
    }

    // Calculate score and percentage
    const score = correctCount
    const percentage =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 1000) / 10 : 0

    // Format topic performance array
    const formattedTopicPerformance = Object.entries(topicStats).map(([topic, stats]) => ({
      topic,
      correct: stats.correct,
      total: stats.total,
      percentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0
    }))

    // Calculate time taken
    const now = new Date()
    const diffSeconds = Math.max(0, Math.floor((now.getTime() - new Date(attempt.startTime).getTime()) / 1000))
    const maxAllowedSeconds = attempt.test.duration * 60
    const timeTakenSeconds = Math.min(diffSeconds, maxAllowedSeconds)

    // Create Result record
    await tx.result.create({
      data: {
        attemptId: attempt.id,
        score,
        percentage,
        correctCount,
        incorrectCount,
        unansweredCount,
        timeTakenSeconds,
        topicPerformance: JSON.stringify(formattedTopicPerformance)
      }
    })

    // Mark attempt COMPLETED
    await tx.testAttempt.update({
      where: { id: attempt.id },
      data: {
        status: "COMPLETED",
        endTime: now
      }
    })

    return {
      success: true,
      attemptId: attempt.id,
      testId: attempt.testId
    } as const
  }, {
    timeout: 30000, // 30s — needed for Supabase (remote DB, multiple queries per tx)
  })

  // Revalidate cache AFTER the transaction commits (only when invoked outside of render).
  if (shouldRevalidate && txResult.success && txResult.testId) {
    try {
      revalidatePath(`/student/dashboard`)
      revalidatePath(`/student/history`)
      revalidatePath(`/student/tests/${txResult.testId}`)
      revalidatePath(`/student/tests/${txResult.testId}/result`)
      revalidatePath(`/instructor/tests/${txResult.testId}/results`)
      revalidatePath(`/instructor/tests`)
      revalidatePath(`/instructor/dashboard`)
    } catch {
      // Ignore revalidation errors if invoked in render context
    }
  }

  return txResult
}

/**
 * Get Result details for a completed attempt.
 * Authorized for the student who took it or the instructor who created the test.
 */
export async function getAttemptResult(attemptId: string) {
  try {
    const session = await auth()
    if (!session || !session.user) {
      return { success: false, error: "Unauthorized" }
    }

    const attempt = await prisma.testAttempt.findUnique({
      where: { id: attemptId },
      include: {
        test: {
          include: {
            _count: { select: { questions: true } }
          }
        },
        result: true,
        student: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      }
    })

    if (!attempt || !attempt.result) {
      return { success: false, error: "Result not found or test is still in progress" }
    }

    // Access control: only the student or the instructor who owns the test can view
    const isOwnerStudent = session.user.role === "STUDENT" && attempt.studentId === session.user.id
    const isOwnerInstructor = session.user.role === "INSTRUCTOR" && attempt.test.creatorId === session.user.id

    if (!isOwnerStudent && !isOwnerInstructor) {
      return { success: false, error: "Unauthorized: You do not have permission to view this result" }
    }

    let parsedTopics: Array<{ topic: string; correct: number; total: number; percentage: number }> = []
    try {
      if (attempt.result.topicPerformance) {
        parsedTopics = JSON.parse(attempt.result.topicPerformance)
      }
    } catch {
      parsedTopics = []
    }

    return {
      success: true,
      result: {
        id: attempt.result.id,
        attemptId: attempt.id,
        testId: attempt.test.id,
        testTitle: attempt.test.title,
        subject: attempt.test.subject,
        topic: attempt.test.topic,
        difficulty: attempt.test.difficulty,
        durationMinutes: attempt.test.duration,
        score: attempt.result.score,
        percentage: attempt.result.percentage,
        totalQuestions: attempt.test._count.questions,
        correctCount: attempt.result.correctCount,
        incorrectCount: attempt.result.incorrectCount,
        unansweredCount: attempt.result.unansweredCount,
        timeTakenSeconds: attempt.result.timeTakenSeconds,
        completedAt: attempt.result.createdAt.toISOString(),
        topicPerformance: parsedTopics,
        studentName: attempt.student.name || attempt.student.email
      }
    }
  } catch (error: any) {
    console.error("Get result error:", error)
    return { success: false, error: error.message || "Failed to load result" }
  }
}

/**
 * Get all student results for an assessment (Instructor only).
 */
export async function getInstructorTestResults(testId: string) {
  try {
    const user = await getInstructorSession()

    const test = await prisma.test.findUnique({
      where: { id: testId },
      include: {
        _count: { select: { questions: true } },
        attempts: {
          where: {
            OR: [
              { status: "COMPLETED" },
              { result: { isNot: null } }
            ]
          },
          include: {
            student: {
              select: {
                id: true,
                name: true,
                email: true
              }
            },
            result: true
          },
          orderBy: { startTime: "desc" }
        }
      }
    })

    if (!test) {
      return { success: false, error: "Assessment not found" }
    }

    if (test.creatorId !== user.id) {
      return { success: false, error: "Unauthorized: You do not own this assessment" }
    }

    const submissions = test.attempts
      .filter((att) => att.result !== null)
      .map((att) => ({
        attemptId: att.id,
        studentId: att.student.id,
        studentName: att.student.name || "Student",
        studentEmail: att.student.email,
        score: att.result!.score,
        percentage: att.result!.percentage,
        correctCount: att.result!.correctCount,
        incorrectCount: att.result!.incorrectCount,
        unansweredCount: att.result!.unansweredCount,
        timeTakenSeconds: att.result!.timeTakenSeconds,
        completedAt: att.result!.createdAt.toISOString()
      }))

    return {
      success: true,
      test: {
        id: test.id,
        title: test.title,
        subject: test.subject,
        topic: test.topic,
        difficulty: test.difficulty,
        duration: test.duration,
        totalQuestions: test._count.questions
      },
      submissions
    }
  } catch (error: any) {
    console.error("Instructor results error:", error)
    return { success: false, error: error.message || "Failed to load instructor results" }
  }
}
