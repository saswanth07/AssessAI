import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PlusCircle, FileText, Users, Activity, ArrowRight, BarChart3 } from "lucide-react"
import Link from "next/link"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"

export const dynamic = "force-dynamic"

export default async function InstructorDashboard() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "INSTRUCTOR") {
    redirect("/login")
  }

  // 1. Fetch instructor's assessments
  const tests = await prisma.test.findMany({
    where: { creatorId: session.user.id },
    include: {
      _count: { select: { questions: true, attempts: true } },
      attempts: {
        where: {
          OR: [{ status: "COMPLETED" }, { result: { isNot: null } }]
        },
        include: {
          student: {
            select: { id: true, name: true, email: true }
          },
          result: true
        },
        orderBy: { startTime: "desc" }
      }
    },
    orderBy: { updatedAt: "desc" }
  })

  // 2. Aggregate metrics
  const totalAssessments = tests.length
  
  // Collect all submissions across tests
  const allSubmissions = tests.flatMap((t) =>
    t.attempts
      .filter((a) => a.result !== null)
      .map((a) => ({
        attemptId: a.id,
        testId: t.id,
        testTitle: t.title,
        studentName: a.student.name || a.student.email,
        studentEmail: a.student.email,
        score: a.result!.score,
        percentage: a.result!.percentage,
        completedAt: a.result!.createdAt
      }))
  ).sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())

  const totalSubmissions = allSubmissions.length

  // Unique active students
  const uniqueStudents = new Set(allSubmissions.map((s) => s.studentEmail)).size

  // Average score
  const avgScore =
    totalSubmissions > 0
      ? Math.round(
          (allSubmissions.reduce((acc, s) => acc + s.percentage, 0) / totalSubmissions) * 10
        ) / 10
      : 0

  return (
    <div className="flex flex-col gap-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {session.user.name || session.user.email}! Overview of your assessments and student performance.</p>
        </div>
        <Link href="/instructor/tests/new">
          <Button>
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Assessments</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalAssessments}</div>
            <p className="text-xs text-muted-foreground">Created by you</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Submissions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions}</div>
            <p className="text-xs text-muted-foreground">From {uniqueStudents} unique student(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Class Avg. Score</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubmissions > 0 ? `${avgScore}%` : "—"}</div>
            <p className="text-xs text-muted-foreground">Across all completed assessments</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>Your created assessments and statuses.</CardDescription>
            </div>
            <Link href="/instructor/tests">
              <Button variant="ghost" size="sm" className="text-xs">
                View all <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </Link>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {tests.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center border-2 border-dashed rounded-lg">
                  No assessments created yet.
                </div>
              ) : (
                tests.slice(0, 5).map((test) => (
                  <div key={test.id} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium leading-none">{test.title}</p>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-800 border">
                          {test.status}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {test.subject} • {test.topic} • {test.duration} mins • {test._count.questions} questions
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      {test.status !== "DRAFT" && (
                        <Link href={`/instructor/tests/${test.id}/results`}>
                          <Button variant="secondary" size="sm" className="text-xs gap-1">
                            <BarChart3 className="w-3 h-3" />
                            Results ({test.attempts.length})
                          </Button>
                        </Link>
                      )}
                      <Link href={`/instructor/tests/${test.id}/edit`}>
                        <Button variant="outline" size="sm" className="text-xs">
                          {test.status === "DRAFT" ? "Edit" : "View"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
        
        <Card className="col-span-3">
          <CardHeader>
            <CardTitle>Recent Submissions</CardTitle>
            <CardDescription>Latest test results from students.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {allSubmissions.length === 0 ? (
                <div className="text-sm text-muted-foreground py-8 text-center">
                  No submissions recorded yet.
                </div>
              ) : (
                allSubmissions.slice(0, 5).map((sub, i) => (
                  <div key={i} className="flex items-center justify-between border-b pb-3 last:border-0 last:pb-0">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{sub.studentName}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">
                        {sub.testTitle}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {new Date(sub.completedAt).toLocaleDateString()} at{" "}
                        {new Date(sub.completedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          sub.percentage >= 80
                            ? "text-emerald-700 bg-emerald-50 dark:bg-emerald-950 dark:text-emerald-300"
                            : sub.percentage >= 50
                            ? "text-amber-700 bg-amber-50 dark:bg-amber-950 dark:text-amber-300"
                            : "text-red-700 bg-red-50 dark:bg-red-950 dark:text-red-300"
                        }`}
                      >
                        {sub.percentage}%
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
