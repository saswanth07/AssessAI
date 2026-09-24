import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Clock, CheckCircle2, Target, Award, ArrowRight, Play, BookOpen, AlertCircle } from "lucide-react"
import Link from "next/link"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { StartTestButton } from "@/components/student/start-test-button"

export const dynamic = "force-dynamic"

export default async function StudentDashboard() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  // Fetch all OPEN assessments
  const openTests = await prisma.test.findMany({
    where: { status: "OPEN" },
    include: {
      _count: { select: { questions: true } }
    },
    orderBy: { createdAt: "desc" }
  })

  // Fetch all attempts for this student
  const studentAttempts = await prisma.testAttempt.findMany({
    where: { studentId: session.user.id },
    include: {
      test: true,
      result: true
    },
    orderBy: { startTime: "desc" }
  })

  // Map attempts by testId for fast lookup
  const attemptMap = new Map(studentAttempts.map((att) => [att.testId, att]))

  // Calculate real metrics
  const completedAttempts = studentAttempts.filter((att) => att.status === "COMPLETED" && att.result)
  const inProgressAttempts = studentAttempts.filter(
    (att) => att.status === "IN_PROGRESS" && !att.result
  )
  const completedCount = completedAttempts.length

  const avgScore =
    completedCount > 0
      ? Math.round(
          (completedAttempts.reduce((acc, a) => acc + (a.result?.percentage || 0), 0) /
            completedCount) *
            10
        ) / 10
      : 0

  // Count pending tests: OPEN tests not yet completed
  const pendingCount = openTests.filter((t) => {
    const att = attemptMap.get(t.id)
    return !att || att.status !== "COMPLETED"
  }).length

  // Find strongest topic from completed results
  let strongestTopic = "—"
  let highestTopicPct = -1
  const topicAgg: Record<string, { correct: number; total: number }> = {}

  for (const att of completedAttempts) {
    if (att.result?.topicPerformance) {
      try {
        const topics = JSON.parse(att.result.topicPerformance)
        for (const t of topics) {
          if (!topicAgg[t.topic]) topicAgg[t.topic] = { correct: 0, total: 0 }
          topicAgg[t.topic].correct += t.correct
          topicAgg[t.topic].total += t.total
        }
      } catch {
        // ignore
      }
    }
  }

  for (const [topic, stats] of Object.entries(topicAgg)) {
    if (stats.total >= 1) {
      const pct = (stats.correct / stats.total) * 100
      if (pct > highestTopicPct) {
        highestTopicPct = Math.round(pct)
        strongestTopic = topic
      }
    }
  }

  const getDifficultyBadge = (diff: string) => {
    switch (diff) {
      case "EASY":
        return "text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40"
      case "MEDIUM":
        return "text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40"
      case "HARD":
        return "text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40"
      default:
        return "text-slate-600 bg-slate-50"
    }
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto py-6">
      {/* Welcome Banner */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
          Student Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Welcome back, {session.user.name || session.user.email}! Explore active assessments and view your progress.
        </p>
      </div>

      {/* KPI Overview Grid */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Completed Tests
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Assessments finished</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Average Score
            </CardTitle>
            <Award className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {completedCount > 0 ? `${avgScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Across all completed tests</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Available Tests
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Ready for you to take</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Strongest Topic
            </CardTitle>
            <Target className="h-4 w-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold truncate">{strongestTopic}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {highestTopicPct >= 0 ? `${highestTopicPct}% mastery` : "Take tests to see mastery"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Available Assessments & Recent Results */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        {/* Available Tests (8 cols) */}
        <Card className="lg:col-span-8 shadow-sm">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-lg">Available Assessments</CardTitle>
                <CardDescription className="text-xs">
                  Active tests currently open for submissions.
                </CardDescription>
              </div>
              <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                {openTests.length} Total
              </span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {openTests.length === 0 ? (
                <div className="text-sm text-muted-foreground py-12 text-center border-2 border-dashed rounded-lg space-y-2">
                  <BookOpen className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700" />
                  <p className="font-medium text-slate-700 dark:text-slate-300">
                    No assessments currently open
                  </p>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">
                    Check back later when your instructor publishes new tests.
                  </p>
                </div>
              ) : (
                openTests.map((test) => {
                  const attempt = attemptMap.get(test.id)
                  const attemptStatus = !attempt
                    ? "NOT_STARTED"
                    : attempt.status === "COMPLETED" || attempt.result
                    ? "COMPLETED"
                    : "IN_PROGRESS"

                  return (
                    <div
                      key={test.id}
                      className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-colors flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                            {test.title}
                          </h3>
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${getDifficultyBadge(
                              test.difficulty
                            )}`}
                          >
                            {test.difficulty}
                          </span>
                          {attemptStatus === "IN_PROGRESS" && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              In Progress
                            </span>
                          )}
                          {attemptStatus === "COMPLETED" && (
                            <span className="px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                              Completed ({attempt?.result?.percentage}%)
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-500">
                          {test.subject} • {test.topic}
                          {test.description ? ` • ${test.description}` : ""}
                        </p>

                        <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                          <span className="flex items-center">
                            <Clock className="w-3.5 h-3.5 mr-1" />
                            {test.duration} mins
                          </span>
                          <span>•</span>
                          <span>{test._count.questions} Questions</span>
                        </div>
                      </div>

                      <div className="shrink-0">
                        <StartTestButton
                          testId={test.id}
                          status={attemptStatus}
                          attemptId={attempt?.id}
                        />
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* Recent Results (4 cols) */}
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">Recent Results</CardTitle>
            <CardDescription className="text-xs">
              Your latest evaluated submissions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {completedAttempts.length === 0 ? (
                <div className="text-sm text-muted-foreground py-10 text-center border-2 border-dashed rounded-lg">
                  <Award className="w-8 h-8 mx-auto text-slate-300 dark:text-slate-700 mb-2" />
                  <p className="font-medium text-slate-600 dark:text-slate-400 text-xs">
                    No completed tests yet
                  </p>
                </div>
              ) : (
                completedAttempts.slice(0, 4).map((att) => (
                  <Link
                    key={att.id}
                    href={`/student/tests/${att.testId}/result?attemptId=${att.id}`}
                    className="block p-3 rounded-lg border border-slate-100 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5 truncate pr-2">
                        <p className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                          {att.test.title}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {att.result?.createdAt
                            ? new Date(att.result.createdAt).toLocaleDateString()
                            : ""}
                        </p>
                      </div>
                      <div
                        className={`text-sm font-bold shrink-0 ${
                          (att.result?.percentage || 0) >= 80
                            ? "text-emerald-600"
                            : (att.result?.percentage || 0) >= 50
                            ? "text-amber-600"
                            : "text-red-600"
                        }`}
                      >
                        {att.result?.percentage}%
                      </div>
                    </div>
                  </Link>
                ))
              )}

              {completedAttempts.length > 0 && (
                <Link href="/student/history" className="block w-full pt-2">
                  <Button variant="outline" className="w-full text-xs" size="sm">
                    View Full Test History
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
