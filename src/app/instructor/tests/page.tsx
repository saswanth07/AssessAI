import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { PlusCircle, FileText, Clock, HelpCircle, Users, Sparkles, BookOpen } from "lucide-react"
import { AssessmentListActions } from "@/components/instructor/assessment-list-actions"

export const dynamic = "force-dynamic"

export default async function TestsPage() {
  const session = await auth()
  if (!session || session.user.role !== "INSTRUCTOR") {
    redirect("/login")
  }

  const tests = await prisma.test.findMany({
    where: { creatorId: session.user.id },
    orderBy: { updatedAt: "desc" },
    include: {
      _count: {
        select: {
          questions: true,
          attempts: {
            where: {
              OR: [{ status: "COMPLETED" }, { result: { isNot: null } }]
            }
          }
        }
      }
    }
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "OPEN":
        return "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800"
      case "DRAFT":
        return "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-200 dark:border-amber-800"
      case "CLOSED":
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300 border-slate-200 dark:border-slate-700"
      case "ARCHIVED":
        return "bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-200 dark:border-zinc-700"
      default:
        return "bg-slate-100 text-slate-800 border-slate-200"
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
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Assessments</h1>
          <p className="text-muted-foreground mt-1">
            Manage your tests, author questions manually or with AI, and track results.
          </p>
        </div>
        <Link href="/instructor/tests/new">
          <Button className="shadow-sm">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </Link>
      </div>

      <div className="grid gap-4">
        {tests.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="text-center py-20 space-y-4">
              <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                <FileText className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  No assessments created yet
                </h3>
                <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                  Get started by creating your first assessment. You can write questions manually or generate them with AI.
                </p>
              </div>
              <Link href="/instructor/tests/new" className="inline-block pt-2">
                <Button size="sm">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Assessment
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          tests.map((test) => (
            <Card key={test.id} className="shadow-sm hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
              <CardHeader className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <CardTitle className="text-lg font-bold">{test.title}</CardTitle>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
                        test.status
                      )}`}
                    >
                      {test.status}
                    </span>
                    <span
                      className={`inline-block px-2 py-0.5 rounded text-[11px] font-medium ${getDifficultyBadge(
                        test.difficulty
                      )}`}
                    >
                      {test.difficulty}
                    </span>
                  </div>
                  <CardDescription className="text-xs text-slate-500">
                    {test.subject} • {test.topic}
                    {test.description ? ` • ${test.description}` : ""}
                  </CardDescription>
                </div>

                <div className="text-xs text-slate-400 whitespace-nowrap">
                  Created {new Date(test.createdAt).toLocaleDateString()}
                </div>
              </CardHeader>

              <CardContent>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
                    <span className="flex items-center">
                      <HelpCircle className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {test._count.questions} Questions
                    </span>
                    <span className="flex items-center">
                      <Clock className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {test.duration} mins
                    </span>
                    <span className="flex items-center">
                      <Users className="w-3.5 h-3.5 mr-1 text-slate-400" />
                      {test._count.attempts} Submissions
                    </span>
                  </div>

                  <AssessmentListActions
                    testId={test.id}
                    status={test.status}
                    submissionsCount={test._count.attempts}
                  />
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  )
}
