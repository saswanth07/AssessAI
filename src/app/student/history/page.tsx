import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { StudentHistoryTable, HistoryItem } from "@/components/student/student-history-table"

export const dynamic = "force-dynamic"

export default async function StudentHistoryPage() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  // Fetch all completed test attempts for this student
  const completedAttempts = await prisma.testAttempt.findMany({
    where: {
      studentId: session.user.id,
      status: "COMPLETED",
      result: { isNot: null }
    },
    include: {
      test: {
        include: {
          _count: { select: { questions: true } }
        }
      },
      result: true
    },
    orderBy: { endTime: "desc" }
  })

  const historyItems: HistoryItem[] = completedAttempts.map((att) => ({
    id: att.id,
    testId: att.test.id,
    title: att.test.title,
    subject: att.test.subject,
    topic: att.test.topic,
    totalQuestions: att.test._count.questions,
    score: att.result!.score,
    percentage: att.result!.percentage,
    timeTakenSeconds: att.result!.timeTakenSeconds,
    completedAt: att.result!.createdAt.toISOString()
  }))

  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
            Assessment History
          </h1>
          <p className="text-muted-foreground mt-1">
            Review your past assessment results, scores, and performance records.
          </p>
        </div>

        <Link href="/student/dashboard">
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back to Dashboard
          </Button>
        </Link>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <CardTitle className="text-lg">Completed Assessments</CardTitle>
          <CardDescription className="text-xs">
            A comprehensive log of all your evaluated test attempts and feedback links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StudentHistoryTable items={historyItems} />
        </CardContent>
      </Card>
    </div>
  )
}
