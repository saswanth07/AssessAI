import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { getTestForTaking } from "@/app/actions/student-test"
import { TestTakingInterface } from "@/components/student/test-taking-interface"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { AlertCircle, ArrowLeft } from "lucide-react"
import Link from "next/link"

export const dynamic = "force-dynamic"

interface PageProps {
  params: Promise<{ id: string }>
}

export default async function StudentTestPage({ params }: PageProps) {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  const { id } = await params
  const testData = await getTestForTaking(id)

  if (!testData.success) {
    if (testData.isCompleted && testData.attemptId) {
      redirect(`/student/tests/${id}/result?attemptId=${testData.attemptId}`)
    }

    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <Card className="max-w-md w-full border-red-200 dark:border-red-900 shadow-sm">
          <CardHeader>
            <div className="flex items-center space-x-2 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5" />
              <CardTitle className="text-lg">Assessment Unavailable</CardTitle>
            </div>
            <CardDescription className="pt-2 text-slate-600 dark:text-slate-400">
              {testData.error || "Unable to load the requested assessment."}
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

  return (
    <TestTakingInterface
      attemptId={testData.attemptId!}
      testId={testData.testId!}
      title={testData.title!}
      subject={testData.subject!}
      topic={testData.topic!}
      durationMinutes={testData.durationMinutes!}
      serverExpiresAt={testData.serverExpiresAt!}
      remainingSeconds={testData.remainingSeconds!}
      totalQuestions={testData.totalQuestions!}
      questions={testData.questions!}
      savedAnswers={testData.savedAnswers!}
    />
  )
}
