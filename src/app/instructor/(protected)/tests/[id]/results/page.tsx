import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getInstructorTestResults } from "@/app/actions/student-test"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  Users,
  Clock,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Award,
  TrendingUp,
  TrendingDown,
  FileText
} from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface InstructorResultsProps {
  params: Promise<{ id: string }>
}

export default async function InstructorTestResultsPage({ params }: InstructorResultsProps) {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "INSTRUCTOR") {
    redirect("/login")
  }

  const { id } = await params
  const res = await getInstructorTestResults(id)

  if (!res.success || !res.test) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900 shadow-sm">
          <CardHeader>
            <CardTitle className="text-red-600 dark:text-red-400">Assessment Not Found</CardTitle>
            <CardDescription className="pt-1">
              {res.error || "The requested assessment could not be loaded or you do not have permission to view it."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/instructor/tests">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Assessments
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    if (mins === 0) return `${rem}s`
    return `${mins}m ${rem}s`
  }

  const submissions = res.submissions || []
  const hasSubmissions = submissions.length > 0

  const avgScore = hasSubmissions
    ? Math.round(
        (submissions.reduce((acc, s) => acc + s.percentage, 0) / submissions.length) * 10
      ) / 10
    : 0

  const highestScore = hasSubmissions
    ? Math.max(...submissions.map((s) => s.percentage))
    : 0

  const lowestScore = hasSubmissions
    ? Math.min(...submissions.map((s) => s.percentage))
    : 0

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto py-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center space-x-2 text-xs text-muted-foreground mb-1">
            <span>{res.test.subject}</span>
            <span>•</span>
            <span>{res.test.topic}</span>
            <span>•</span>
            <span>{res.test.totalQuestions} Questions</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            {res.test.title} — Results
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            View student submissions, score breakdown, and individual attempt details.
          </p>
        </div>

        <Link href="/instructor/tests">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Assessments
          </Button>
        </Link>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Submissions
            </CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{submissions.length}</div>
            <p className="text-xs text-muted-foreground mt-1">Students completed</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Class Average
            </CardTitle>
            <Award className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {hasSubmissions ? `${avgScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Overall performance</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Score Range
            </CardTitle>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {hasSubmissions ? `${highestScore}% / ${lowestScore}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Highest / Lowest score</p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Duration Limit
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{res.test.duration} mins</div>
            <p className="text-xs text-muted-foreground mt-1">Allocated time limit</p>
          </CardContent>
        </Card>
      </div>

      {/* Submissions Table */}
      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Student Submissions</CardTitle>
          <CardDescription className="text-xs">
            All submitted test attempts by authenticated students for this assessment.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!hasSubmissions ? (
            <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg space-y-2">
              <Users className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
              <div className="text-base font-medium text-slate-700 dark:text-slate-300">
                No submissions yet
              </div>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Once students take and submit this assessment, their evaluated scores and time metrics will be logged here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b">
                  <tr>
                    <th className="px-4 py-3">Student</th>
                    <th className="px-4 py-3">Score</th>
                    <th className="px-4 py-3">Percentage</th>
                    <th className="px-4 py-3">Correct / Wrong / Skipped</th>
                    <th className="px-4 py-3">Time Taken</th>
                    <th className="px-4 py-3">Submitted At</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {submissions.map((sub) => (
                    <tr key={sub.attemptId} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                      <td className="px-4 py-3.5">
                        <div className="font-medium text-slate-900 dark:text-slate-100">
                          {sub.studentName}
                        </div>
                        <div className="text-xs text-slate-500">{sub.studentEmail}</div>
                      </td>
                      <td className="px-4 py-3.5 font-semibold">
                        {sub.score} / {res.test.totalQuestions}
                      </td>
                      <td className="px-4 py-3.5">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                            sub.percentage >= 80
                              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                              : sub.percentage >= 50
                              ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                              : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                          }`}
                        >
                          {sub.percentage}%
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        <span className="text-emerald-600 font-medium">{sub.correctCount} correct</span>
                        {" • "}
                        <span className="text-red-600 font-medium">{sub.incorrectCount} wrong</span>
                        {" • "}
                        <span className="text-slate-500">{sub.unansweredCount} skipped</span>
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-600 dark:text-slate-400">
                        {formatTime(sub.timeTakenSeconds)}
                      </td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">
                        {new Date(sub.completedAt).toLocaleDateString()}{" "}
                        {new Date(sub.completedAt).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit"
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
