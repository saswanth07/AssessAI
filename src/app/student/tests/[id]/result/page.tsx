import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { getAttemptResult } from "@/app/actions/student-test"
import { getAIFeedback } from "@/app/actions/ai-feedback"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  HelpCircle,
  ArrowLeft,
  History,
  TrendingUp,
  AlertCircle
} from "lucide-react"
import Link from "next/link"
import { AIFeedbackPanel } from "@/components/student/ai-feedback-panel"

export const dynamic = "force-dynamic"

interface ResultPageProps {
  params: Promise<{ id: string }>
  searchParams: Promise<{ attemptId?: string }>
}

export default async function StudentTestResultPage({ params, searchParams }: ResultPageProps) {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  const { id: testId } = await params
  const { attemptId: queryAttemptId } = await searchParams

  let targetAttemptId = queryAttemptId

  if (!targetAttemptId) {
    const attempt = await prisma.testAttempt.findUnique({
      where: {
        studentId_testId: {
          studentId: session.user.id,
          testId: testId
        }
      }
    })
    if (attempt) {
      targetAttemptId = attempt.id
    }
  }

  if (!targetAttemptId) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <div className="flex items-center space-x-2 text-amber-600">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Result Not Found</CardTitle>
            </div>
            <CardDescription className="pt-2">
              No completed attempt found for this assessment.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student/dashboard">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const resultData = await getAttemptResult(targetAttemptId)

  if (!resultData.success || !resultData.result) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600">
              <AlertCircle className="w-5 h-5" />
              <CardTitle>Error Loading Result</CardTitle>
            </div>
            <CardDescription className="pt-2">
              {resultData.error || "Unable to display result summary."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/student/dashboard">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Return to Dashboard
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const res = resultData.result

  // Load existing AI feedback server-side (non-blocking — if missing or error, panel handles it)
  let initialFeedback = null
  try {
    const feedbackResult = await getAIFeedback(res.id)
    if (feedbackResult.success && feedbackResult.hasFeedback && feedbackResult.feedback) {
      initialFeedback = feedbackResult.feedback
    }
  } catch {
    // AI feedback loading failure must never block the result page
  }

  const formatTimeTaken = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const remainingSecs = secs % 60
    if (mins === 0) return `${remainingSecs}s`
    return `${mins}m ${remainingSecs}s`
  }

  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 dark:border-slate-800 pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
            <span>{res.subject}</span>
            <span>•</span>
            <span>{res.topic}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {res.testTitle}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Completed on {new Date(res.completedAt).toLocaleDateString()} at{" "}
            {new Date(res.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/student/dashboard">
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              Dashboard
            </Button>
          </Link>
          <Link href="/student/history">
            <Button variant="secondary" size="sm">
              <History className="w-4 h-4 mr-1.5" />
              All History
            </Button>
          </Link>
        </div>
      </div>

      {/* Hero Score Card */}
      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-none shadow-lg overflow-hidden">
        <CardContent className="p-6 sm:p-8">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
            {/* Left: Score & Percentage */}
            <div className="md:col-span-6 space-y-2 text-center md:text-left">
              <span className="text-xs uppercase tracking-wider font-semibold text-slate-400">
                Performance Summary
              </span>
              <div className="flex items-baseline space-x-3 justify-center md:justify-start">
                <span className="text-5xl sm:text-6xl font-extrabold tracking-tight text-white">
                  {res.percentage}%
                </span>
                <span className="text-xl sm:text-2xl font-medium text-slate-300">
                  ({res.score} / {res.totalQuestions} Marks)
                </span>
              </div>
              <p className="text-sm text-slate-300">
                {res.percentage >= 80
                  ? "Outstanding performance! You have demonstrated strong mastery."
                  : res.percentage >= 60
                  ? "Good job! You passed this assessment."
                  : "Keep practicing to reinforce your understanding of these concepts."}
              </p>
            </div>

            {/* Right: Quick Stats */}
            <div className="md:col-span-6 grid grid-cols-2 gap-3">
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-emerald-400">{res.correctCount}</div>
                <div className="text-xs text-slate-300 mt-1">Correct Answers</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-red-400">{res.incorrectCount}</div>
                <div className="text-xs text-slate-300 mt-1">Incorrect Answers</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-amber-300">{res.unansweredCount}</div>
                <div className="text-xs text-slate-300 mt-1">Unanswered</div>
              </div>
              <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 text-center">
                <div className="text-2xl font-bold text-sky-400">{formatTimeTaken(res.timeTakenSeconds)}</div>
                <div className="text-xs text-slate-300 mt-1">Time Taken</div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Breakdown Metrics Grid */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Correct</CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{res.correctCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {res.totalQuestions > 0
                ? `${Math.round((res.correctCount / res.totalQuestions) * 100)}% of total`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Incorrect</CardTitle>
            <XCircle className="w-4 h-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{res.incorrectCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {res.totalQuestions > 0
                ? `${Math.round((res.incorrectCount / res.totalQuestions) * 100)}% of total`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Unanswered</CardTitle>
            <HelpCircle className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-600">{res.unansweredCount}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {res.totalQuestions > 0
                ? `${Math.round((res.unansweredCount / res.totalQuestions) * 100)}% omitted`
                : "0%"}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-slate-500 uppercase">Duration Used</CardTitle>
            <Clock className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-200">
              {formatTimeTaken(res.timeTakenSeconds)}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Out of {res.durationMinutes} minutes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Topic-Wise Performance Breakdown */}
      <Card className="shadow-sm">
        <CardHeader>
          <div className="flex items-center space-x-2">
            <TrendingUp className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg">Topic-Wise Performance</CardTitle>
          </div>
          <CardDescription>
            Detailed accuracy breakdown across each subject topic evaluated in this assessment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {res.topicPerformance && res.topicPerformance.length > 0 ? (
            <div className="space-y-4">
              {res.topicPerformance.map((item, idx) => (
                <div key={idx} className="space-y-2 border-b border-slate-100 dark:border-slate-800 pb-4 last:border-0 last:pb-0">
                  <div className="flex justify-between items-center text-sm">
                    <span className="font-medium text-slate-900 dark:text-slate-100">{item.topic}</span>
                    <div className="flex items-center space-x-3 text-xs">
                      <span className="text-slate-500">
                        {item.correct} / {item.total} Correct
                      </span>
                      <span
                        className={`font-semibold ${
                          item.percentage >= 80
                            ? "text-emerald-600"
                            : item.percentage >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {item.percentage}%
                      </span>
                    </div>
                  </div>
                  <div className="w-full h-2.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        item.percentage >= 80
                          ? "bg-emerald-500"
                          : item.percentage >= 50
                          ? "bg-amber-500"
                          : "bg-red-500"
                      }`}
                      style={{ width: `${item.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-slate-500 py-4 text-center">
              No topic breakdown available for this test.
            </div>
          )}
        </CardContent>
      </Card>

      {/* AI Performance Insights — Phase 6 */}
      <AIFeedbackPanel resultId={res.id} initialFeedback={initialFeedback} />
    </div>
  )
}
