"use client"

import React, { useState, useEffect, useCallback, useRef } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Send,
  HelpCircle,
  RotateCcw,
  Check,
  AlertTriangle
} from "lucide-react"
import { saveAnswer, submitTestAttempt } from "@/app/actions/student-test"

interface SafeQuestion {
  id: string
  question: string
  type: string
  options: string[]
  topic?: string | null
  difficulty?: string
  order: number
}

interface TestTakingProps {
  attemptId: string
  testId: string
  title: string
  subject: string
  topic: string
  durationMinutes: number
  serverExpiresAt: string
  remainingSeconds: number
  totalQuestions: number
  questions: SafeQuestion[]
  savedAnswers: Record<string, string>
}

export function TestTakingInterface({
  attemptId,
  testId,
  title,
  subject,
  topic,
  durationMinutes,
  serverExpiresAt,
  remainingSeconds: initialRemainingSeconds,
  totalQuestions,
  questions,
  savedAnswers: initialSavedAnswers
}: TestTakingProps) {
  const router = useRouter()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>(initialSavedAnswers)
  const [savingState, setSavingState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  const [timeLeft, setTimeLeft] = useState<number>(initialRemainingSeconds)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submissionError, setSubmissionError] = useState<string | null>(null)
  const hasAutoSubmitted = useRef(false)

  // Calculate live countdown based on authoritative serverExpiresAt
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const targetTime = new Date(serverExpiresAt).getTime()
      const now = Date.now()
      const diff = Math.max(0, Math.floor((targetTime - now) / 1000))
      return diff
    }

    // Set initial exact remaining time
    setTimeLeft(calculateTimeRemaining())

    const interval = setInterval(() => {
      const remaining = calculateTimeRemaining()
      setTimeLeft(remaining)

      if (remaining <= 0 && !hasAutoSubmitted.current) {
        hasAutoSubmitted.current = true
        clearInterval(interval)
        handleFinalSubmit(true)
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [serverExpiresAt])

  // Keyboard navigation shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (showConfirmModal || isSubmitting) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return

      if (e.key === "ArrowRight" && currentIndex < totalQuestions - 1) {
        setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))
      } else if (e.key === "ArrowLeft" && currentIndex > 0) {
        setCurrentIndex((prev) => Math.max(0, prev - 1))
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [currentIndex, totalQuestions, showConfirmModal, isSubmitting])

  const currentQuestion = questions[currentIndex]

  // Count answered questions
  const answeredCount = Object.keys(answers).filter(
    (qId) => answers[qId] && answers[qId].trim() !== ""
  ).length
  const unansweredCount = totalQuestions - answeredCount

  // Handle option selection
  const handleSelectOption = async (option: string) => {
    if (isSubmitting || timeLeft <= 0) return

    const newAnswers = { ...answers, [currentQuestion.id]: option }
    setAnswers(newAnswers)
    setSavingState("saving")

    try {
      const res = await saveAnswer(attemptId, currentQuestion.id, option)
      if (res.success) {
        setSavingState("saved")
      } else {
        if (res.isExpired) {
          handleFinalSubmit(true)
        } else {
          setSavingState("error")
        }
      }
    } catch {
      setSavingState("error")
    }
  }

  // Handle clearing answer for current question
  const handleClearAnswer = async () => {
    if (isSubmitting || timeLeft <= 0 || !answers[currentQuestion.id]) return

    const newAnswers = { ...answers }
    delete newAnswers[currentQuestion.id]
    setAnswers(newAnswers)
    setSavingState("saving")

    try {
      const res = await saveAnswer(attemptId, currentQuestion.id, null)
      if (res.success) {
        setSavingState("saved")
      } else {
        setSavingState("error")
      }
    } catch {
      setSavingState("error")
    }
  }

  // Handle final submission (manual or auto)
  const handleFinalSubmit = useCallback(
    async (isAuto = false) => {
      if (isSubmitting) return
      setIsSubmitting(true)
      setSubmissionError(null)

      try {
        const res = await submitTestAttempt(attemptId)
        if (res.success) {
          router.push(`/student/tests/${testId}/result?attemptId=${attemptId}`)
        } else {
          setSubmissionError(res.error || "Submission failed. Please try again.")
          setIsSubmitting(false)
        }
      } catch (err: any) {
        setSubmissionError(err?.message || "An unexpected error occurred during submission.")
        setIsSubmitting(false)
      }
    },
    [attemptId, testId, isSubmitting, router]
  )

  // Format timer display mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
  }

  // Timer warning level
  const isCritical = timeLeft < 60 // under 1 minute
  const isWarning = timeLeft < 300 // under 5 minutes

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col">
      {/* Top Header Bar */}
      <header className="sticky top-0 z-40 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          <div className="flex items-center space-x-3 truncate">
            <div className="w-9 h-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold text-base shrink-0">
              {currentIndex + 1}
            </div>
            <div className="truncate">
              <h1 className="text-base font-semibold text-slate-900 dark:text-slate-100 truncate">{title}</h1>
              <p className="text-xs text-slate-500 truncate">
                {subject} • {topic} • Question {currentIndex + 1} of {totalQuestions}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 shrink-0">
            {/* Countdown Timer */}
            <div
              className={`flex items-center space-x-2 px-3.5 py-1.5 rounded-full font-mono text-sm font-semibold transition-colors ${
                isCritical
                  ? "bg-red-100 text-red-700 dark:bg-red-950/80 dark:text-red-400 animate-pulse border border-red-300 dark:border-red-800"
                  : isWarning
                  ? "bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-400 border border-amber-300 dark:border-amber-800"
                  : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-700"
              }`}
            >
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeLeft)}</span>
            </div>

            {/* Submit Button */}
            <Button
              onClick={() => setShowConfirmModal(true)}
              disabled={isSubmitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm"
              size="sm"
            >
              <Send className="w-4 h-4 mr-1.5" />
              Submit Test
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left / Center: Active Question Area (8 cols) */}
        <div className="lg:col-span-8 flex flex-col space-y-4">
          <Card className="flex-1 shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-4 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                    Question {currentIndex + 1} of {totalQuestions}
                  </span>
                  {currentQuestion?.difficulty && (
                    <span className="text-xs uppercase px-2 py-0.5 rounded font-medium text-slate-500 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      {currentQuestion.difficulty}
                    </span>
                  )}
                  {currentQuestion?.type && (
                    <span className="text-xs font-medium text-slate-500">
                      {currentQuestion.type === "TRUE_FALSE" ? "True / False" : "Multiple Choice"}
                    </span>
                  )}
                </div>
              </div>

              {/* Live Save Status Indicator */}
              <div className="text-xs text-slate-500 flex items-center space-x-1.5">
                {savingState === "saving" && <span className="text-amber-500">Saving...</span>}
                {savingState === "saved" && (
                  <span className="text-emerald-600 flex items-center">
                    <Check className="w-3.5 h-3.5 mr-0.5" /> Saved
                  </span>
                )}
                {savingState === "error" && <span className="text-red-500">Auto-save error</span>}
              </div>
            </CardHeader>

            <CardContent className="pt-6 space-y-6">
              {/* Question Text */}
              <div className="text-base sm:text-lg font-medium text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap">
                {currentQuestion?.question}
              </div>

              {/* Options List */}
              <div className="space-y-3 pt-2">
                {currentQuestion?.options.map((option, optIdx) => {
                  const isSelected = answers[currentQuestion.id] === option
                  const optionLetters = ["A", "B", "C", "D", "E", "F"]
                  const letter = optionLetters[optIdx] || `${optIdx + 1}`

                  return (
                    <button
                      key={optIdx}
                      type="button"
                      onClick={() => handleSelectOption(option)}
                      className={`w-full text-left p-4 rounded-xl border-2 transition-all flex items-start space-x-3.5 ${
                        isSelected
                          ? "border-primary bg-primary/5 dark:bg-primary/10 shadow-sm"
                          : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-full flex items-center justify-center font-semibold text-xs shrink-0 transition-colors ${
                          isSelected
                            ? "bg-primary text-primary-foreground"
                            : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        }`}
                      >
                        {letter}
                      </div>
                      <span className="flex-1 text-sm sm:text-base font-normal text-slate-800 dark:text-slate-200 pt-0.5">
                        {option}
                      </span>
                    </button>
                  )
                })}
              </div>

              {/* Clear Answer Button */}
              {answers[currentQuestion?.id] && (
                <div className="flex justify-end pt-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClearAnswer}
                    className="text-xs text-slate-500 hover:text-red-600 dark:hover:text-red-400"
                  >
                    <RotateCcw className="w-3.5 h-3.5 mr-1" />
                    Clear Answer
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Navigation Controls Bar */}
          <div className="flex items-center justify-between py-2">
            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
              disabled={currentIndex === 0}
              className="space-x-1.5"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Previous</span>
            </Button>

            <span className="text-xs text-slate-500">
              {currentIndex + 1} of {totalQuestions}
            </span>

            <Button
              variant="outline"
              onClick={() => setCurrentIndex((prev) => Math.min(totalQuestions - 1, prev + 1))}
              disabled={currentIndex === totalQuestions - 1}
              className="space-x-1.5"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Right: Question Palette & Overview (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold">Question Navigator</CardTitle>
              <CardDescription className="text-xs">
                Jump directly to any question in the assessment.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5">
              {/* Question Number Grid */}
              <div className="grid grid-cols-5 gap-2">
                {questions.map((q, idx) => {
                  const isCurrent = idx === currentIndex
                  const isAnswered = !!answers[q.id] && answers[q.id].trim() !== ""

                  return (
                    <button
                      key={q.id}
                      type="button"
                      onClick={() => setCurrentIndex(idx)}
                      className={`h-10 rounded-lg text-xs font-semibold flex items-center justify-center transition-all relative ${
                        isCurrent
                          ? "ring-2 ring-primary ring-offset-2 bg-primary text-primary-foreground font-bold shadow"
                          : isAnswered
                          ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800"
                          : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700"
                      }`}
                    >
                      {idx + 1}
                    </button>
                  )
                })}
              </div>

              {/* Palette Legend */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 grid grid-cols-3 gap-2 text-[11px] text-slate-500">
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded bg-primary"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded bg-emerald-500"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <div className="w-3 h-3 rounded bg-slate-200 dark:bg-slate-700"></div>
                  <span>Unanswered</span>
                </div>
              </div>

              {/* Progress Summary Box */}
              <div className="bg-slate-50 dark:bg-slate-900 rounded-xl p-3.5 border border-slate-200 dark:border-slate-800 space-y-2">
                <div className="flex justify-between text-xs font-medium">
                  <span className="text-slate-600 dark:text-slate-400">Answered Progress</span>
                  <span className="text-slate-900 dark:text-slate-100 font-bold">
                    {answeredCount} / {totalQuestions}
                  </span>
                </div>
                <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-emerald-500 transition-all duration-300"
                    style={{ width: `${(answeredCount / totalQuestions) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 pt-1">
                  <span>{unansweredCount} Unanswered</span>
                  <span>{Math.round((answeredCount / totalQuestions) * 100)}% Complete</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <Card className="max-w-md w-full shadow-2xl border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <CardHeader>
              <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <CardTitle className="text-lg">Submit Assessment?</CardTitle>
              </div>
              <CardDescription className="text-sm pt-1">
                Are you sure you want to submit your test? Once submitted, you cannot change your answers.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-950/50 p-3 rounded-lg border border-emerald-200 dark:border-emerald-800/60">
                  <div className="text-2xl font-bold text-emerald-700 dark:text-emerald-400">
                    {answeredCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Answered</div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-950/50 p-3 rounded-lg border border-amber-200 dark:border-amber-800/60">
                  <div className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                    {unansweredCount}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">Unanswered</div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2.5 rounded-md">
                <span>Remaining Time:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {formatTime(timeLeft)}
                </span>
              </div>

              {submissionError && (
                <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 p-2.5 rounded border border-red-200 dark:border-red-900">
                  {submissionError}
                </div>
              )}

              <div className="flex items-center space-x-3 pt-2">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => setShowConfirmModal(false)}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={() => handleFinalSubmit(false)}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? "Submitting..." : "Yes, Submit Test"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
