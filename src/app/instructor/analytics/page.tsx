import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import { prisma } from "@/lib/db"
import { AnalyticsDashboard, AnalyticsData } from "@/components/instructor/analytics-dashboard"

export const dynamic = "force-dynamic"

export default async function InstructorAnalyticsPage() {
  const session = await auth()
  if (!session || !session.user || session.user.role !== "INSTRUCTOR") {
    redirect("/login")
  }

  // Fetch all tests created by this instructor
  const tests = await prisma.test.findMany({
    where: { creatorId: session.user.id },
    include: {
      attempts: {
        where: {
          OR: [{ status: "COMPLETED" }, { result: { isNot: null } }]
        },
        include: {
          result: true
        }
      }
    },
    orderBy: { createdAt: "desc" }
  })

  // Compute metrics
  const totalAssessments = tests.length
  const openAssessments = tests.filter((t) => t.status === "OPEN").length
  const closedAssessments = tests.filter((t) => t.status === "CLOSED").length
  const draftAssessments = tests.filter((t) => t.status === "DRAFT").length
  const archivedAssessments = tests.filter((t) => t.status === "ARCHIVED").length

  let totalAttempts = 0
  let completedAttempts = 0
  let totalScoreSum = 0

  const scoreBuckets = {
    "0–20%": 0,
    "21–40%": 0,
    "41–60%": 0,
    "61–80%": 0,
    "81–100%": 0
  }

  const assessmentPerformance: Array<{ title: string; attempts: number; avgPercentage: number }> = []
  const topicAgg: Record<string, { correct: number; total: number }> = {}

  for (const test of tests) {
    const validAttempts = test.attempts.filter((a) => a.result !== null)
    totalAttempts += test.attempts.length
    completedAttempts += validAttempts.length

    let testScoreSum = 0
    for (const att of validAttempts) {
      const pct = att.result!.percentage
      testScoreSum += pct
      totalScoreSum += pct

      // Score distribution
      if (pct <= 20) scoreBuckets["0–20%"]++
      else if (pct <= 40) scoreBuckets["21–40%"]++
      else if (pct <= 60) scoreBuckets["41–60%"]++
      else if (pct <= 80) scoreBuckets["61–80%"]++
      else scoreBuckets["81–100%"]++

      // Topic aggregation
      if (att.result!.topicPerformance) {
        try {
          const topics = JSON.parse(att.result!.topicPerformance)
          for (const item of topics) {
            if (!topicAgg[item.topic]) topicAgg[item.topic] = { correct: 0, total: 0 }
            topicAgg[item.topic].correct += item.correct
            topicAgg[item.topic].total += item.total
          }
        } catch {
          // ignore malformed topic json
        }
      }
    }

    if (validAttempts.length > 0) {
      assessmentPerformance.push({
        title: test.title.length > 18 ? test.title.substring(0, 18) + "..." : test.title,
        attempts: validAttempts.length,
        avgPercentage: Math.round((testScoreSum / validAttempts.length) * 10) / 10
      })
    }
  }

  const averagePercentage =
    completedAttempts > 0 ? Math.round((totalScoreSum / completedAttempts) * 10) / 10 : 0

  const scoreDistribution = Object.entries(scoreBuckets).map(([range, count]) => ({
    range,
    count
  }))

  const topicPerformance = Object.entries(topicAgg).map(([topic, stats]) => ({
    topic,
    avgPercentage: stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0,
    totalTested: stats.total
  }))

  const analyticsData: AnalyticsData = {
    totalAssessments,
    openAssessments,
    closedAssessments,
    draftAssessments,
    archivedAssessments,
    totalAttempts,
    completedAttempts,
    averagePercentage,
    scoreDistribution,
    assessmentPerformance,
    topicPerformance
  }

  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto py-6">
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
        <p className="text-muted-foreground mt-1">
          Aggregated student insights, assessment completion rates, and topic mastery.
        </p>
      </div>

      <AnalyticsDashboard data={analyticsData} />
    </div>
  )
}
