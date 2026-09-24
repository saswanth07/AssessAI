import { auth } from "@/lib/auth"
import { prisma } from "@/lib/db"
import { redirect, notFound } from "next/navigation"
import QuestionBuilder from "@/components/assessment/question-builder"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { BarChart3 } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function EditAssessmentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await auth()
  if (!session || session.user.role !== "INSTRUCTOR") {
    redirect("/login")
  }

  const test = await prisma.test.findUnique({
    where: { id },
    include: {
      questions: { orderBy: { order: 'asc' } },
      _count: { select: { attempts: true } }
    }
  })

  if (!test) return notFound()
  
  if (test.creatorId !== session.user.id) {
    return <div className="p-8 text-red-500 font-bold">Unauthorized</div>
  }

  // Parse options for client component since SQLite stores it as string
  const formattedQuestions = test.questions.map(q => ({
    ...q,
    options: JSON.parse(q.options)
  }))

  return (
    <div className="flex flex-col gap-6 max-w-6xl mx-auto py-6">
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{test.title}</h1>
          <div className="flex gap-4 text-sm text-muted-foreground mt-1">
            <span>{test.subject}</span>
            <span>•</span>
            <span>{test.topic}</span>
            <span>•</span>
            <span className="font-semibold text-primary">{test.status}</span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {test.status !== "DRAFT" && (
            <Link href={`/instructor/tests/${test.id}/results`}>
              <Button variant="secondary" className="gap-1.5">
                <BarChart3 className="w-4 h-4" />
                View Results ({test._count.attempts})
              </Button>
            </Link>
          )}
          <Link href="/instructor/tests">
            <Button variant="outline">Assessments</Button>
          </Link>
          <Link href="/instructor/dashboard">
            <Button variant="outline">Dashboard</Button>
          </Link>
        </div>
      </div>

      <QuestionBuilder 
        testId={test.id} 
        testTopic={test.topic}
        initialQuestions={formattedQuestions}
        status={test.status} 
      />
    </div>
  )
}
