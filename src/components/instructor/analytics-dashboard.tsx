"use client"

import React from "react"
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Award, CheckCircle2, Clock, FileText, TrendingUp, Users } from "lucide-react"

export interface AnalyticsData {
  totalAssessments: number
  openAssessments: number
  closedAssessments: number
  draftAssessments: number
  archivedAssessments: number
  totalAttempts: number
  completedAttempts: number
  averagePercentage: number
  scoreDistribution: Array<{ range: string; count: number }>
  assessmentPerformance: Array<{ title: string; attempts: number; avgPercentage: number }>
  topicPerformance: Array<{ topic: string; avgPercentage: number; totalTested: number }>
}

interface AnalyticsDashboardProps {
  data: AnalyticsData
}

const SCORE_COLORS = ["#ef4444", "#f97316", "#eab308", "#3b82f6", "#10b981"]
const STATUS_COLORS = ["#3b82f6", "#10b981", "#64748b", "#f59e0b"]

export function AnalyticsDashboard({ data }: AnalyticsDashboardProps) {
  const hasData = data.completedAttempts > 0

  const statusPieData = [
    { name: "Open", value: data.openAssessments, color: "#10b981" },
    { name: "Draft", value: data.draftAssessments, color: "#f59e0b" },
    { name: "Closed", value: data.closedAssessments, color: "#64748b" },
    { name: "Archived", value: data.archivedAssessments, color: "#94a3b8" }
  ].filter(d => d.value > 0)

  return (
    <div className="space-y-8">
      {/* KPI Stats Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Total Assessments
            </CardTitle>
            <FileText className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.totalAssessments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.openAssessments} Open • {data.draftAssessments} Drafts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Completed Attempts
            </CardTitle>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">{data.completedAttempts}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.totalAttempts} Total student attempts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Average Score
            </CardTitle>
            <Award className="w-4 h-4 text-sky-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-sky-600">
              {hasData ? `${data.averagePercentage}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Across all completed attempts
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase">
              Assessment Status
            </CardTitle>
            <Clock className="w-4 h-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data.openAssessments} Active</div>
            <p className="text-xs text-muted-foreground mt-1">
              {data.closedAssessments + data.archivedAssessments} Concluded
            </p>
          </CardContent>
        </Card>
      </div>

      {!hasData ? (
        <Card className="shadow-sm border-dashed">
          <CardContent className="py-16 text-center text-muted-foreground space-y-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-base font-medium text-slate-800 dark:text-slate-200">
              No Student Submissions Yet
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Visual performance analytics, score distribution, and topic breakdowns will appear once students start completing your published assessments.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
          {/* Assessment Performance Chart */}
          <Card className="lg:col-span-8 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Assessment Performance</CardTitle>
              <CardDescription className="text-xs">
                Average percentage and completed attempts per assessment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.assessmentPerformance}
                    margin={{ top: 10, right: 20, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis
                      dataKey="title"
                      tick={{ fontSize: 11 }}
                      interval={0}
                      angle={-15}
                      textAnchor="end"
                    />
                    <YAxis tick={{ fontSize: 11 }} domain={[0, 100]} />
                    <Tooltip
                      formatter={(val: any, name?: any) => [
                        name === "avgPercentage" ? `${val}%` : val,
                        name === "avgPercentage" ? "Average Score" : "Attempts"
                      ]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar
                      dataKey="avgPercentage"
                      name="Average Score (%)"
                      fill="#6366f1"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Score Distribution Chart */}
          <Card className="lg:col-span-4 shadow-sm">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Score Distribution</CardTitle>
              <CardDescription className="text-xs">
                Number of submissions in each score bracket.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.scoreDistribution}
                    margin={{ top: 10, right: 10, left: -20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="range" tick={{ fontSize: 11 }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(val: any) => [`${val} students`, "Count"]}
                      contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                    />
                    <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                      {data.scoreDistribution.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={SCORE_COLORS[index % SCORE_COLORS.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Topic Performance Chart */}
          {data.topicPerformance.length > 0 && (
            <Card className="lg:col-span-12 shadow-sm">
              <CardHeader>
                <CardTitle className="text-base font-semibold">Topic Mastery Breakdown</CardTitle>
                <CardDescription className="text-xs">
                  Average student proficiency across evaluated topics.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={data.topicPerformance}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 40, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} opacity={0.3} />
                      <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11 }} />
                      <YAxis
                        type="category"
                        dataKey="topic"
                        tick={{ fontSize: 11 }}
                        width={120}
                      />
                      <Tooltip
                        formatter={(val: any, name?: any) => [
                          name === "avgPercentage" ? `${val}%` : val,
                          name === "avgPercentage" ? "Accuracy" : "Questions Tested"
                        ]}
                        contentStyle={{ borderRadius: "8px", fontSize: "12px" }}
                      />
                      <Bar
                        dataKey="avgPercentage"
                        name="Average Accuracy (%)"
                        fill="#10b981"
                        radius={[0, 4, 4, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  )
}
