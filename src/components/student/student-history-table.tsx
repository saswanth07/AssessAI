"use client"

import React, { useState, useMemo } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ArrowUpRight, Award, Search, Filter } from "lucide-react"

export interface HistoryItem {
  id: string
  testId: string
  title: string
  subject: string
  topic: string
  totalQuestions: number
  score: number
  percentage: number
  timeTakenSeconds: number
  completedAt: string
}

interface StudentHistoryTableProps {
  items: HistoryItem[]
}

export function StudentHistoryTable({ items }: StudentHistoryTableProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedSubject, setSelectedSubject] = useState<string>("ALL")

  // Extract unique subjects
  const subjects = useMemo(() => {
    const set = new Set<string>()
    items.forEach((item) => set.add(item.subject))
    return Array.from(set)
  }, [items])

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesSearch =
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.topic.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.subject.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesSubject = selectedSubject === "ALL" || item.subject === selectedSubject

      return matchesSearch && matchesSubject
    })
  }, [items, searchTerm, selectedSubject])

  const formatTime = (secs: number) => {
    const mins = Math.floor(secs / 60)
    const rem = secs % 60
    if (mins === 0) return `${rem}s`
    return `${mins}m ${rem}s`
  }

  if (items.length === 0) {
    return (
      <div className="py-16 text-center text-muted-foreground border-2 border-dashed rounded-lg space-y-3">
        <Award className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-700" />
        <div className="space-y-1">
          <p className="text-base font-medium text-slate-700 dark:text-slate-300">
            No completed assessments found
          </p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Take an open assessment from your dashboard to see your performance and detailed AI feedback here.
          </p>
        </div>
        <Link href="/student/dashboard" className="inline-block pt-2">
          <Button size="sm">Go to Dashboard</Button>
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <Input
            placeholder="Search by test, subject or topic..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>

        {subjects.length > 1 && (
          <div className="flex items-center space-x-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedSubject("ALL")}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                selectedSubject === "ALL"
                  ? "bg-primary text-primary-foreground"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
              }`}
            >
              All Subjects
            </button>
            {subjects.map((sub) => (
              <button
                key={sub}
                onClick={() => setSelectedSubject(sub)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors whitespace-nowrap ${
                  selectedSubject === sub
                    ? "bg-primary text-primary-foreground"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Table */}
      {filteredItems.length === 0 ? (
        <div className="py-12 text-center text-xs text-muted-foreground border rounded-lg">
          No assessment records match your filter.
        </div>
      ) : (
        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-lg">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-900 border-b">
              <tr>
                <th className="px-4 py-3">Assessment</th>
                <th className="px-4 py-3">Subject / Topic</th>
                <th className="px-4 py-3">Score</th>
                <th className="px-4 py-3">Percentage</th>
                <th className="px-4 py-3">Time Taken</th>
                <th className="px-4 py-3">Date Completed</th>
                <th className="px-4 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredItems.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                  <td className="px-4 py-3.5 font-medium text-slate-900 dark:text-slate-100">
                    {item.title}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {item.subject} • {item.topic}
                  </td>
                  <td className="px-4 py-3.5 font-semibold">
                    {item.score} / {item.totalQuestions}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        item.percentage >= 80
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300"
                          : item.percentage >= 50
                          ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                          : "bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300"
                      }`}
                    >
                      {item.percentage}%
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {formatTime(item.timeTakenSeconds)}
                  </td>
                  <td className="px-4 py-3.5 text-xs text-slate-500">
                    {new Date(item.completedAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3.5 text-right">
                    <Link href={`/student/tests/${item.testId}/result?attemptId=${item.id}`}>
                      <Button variant="ghost" size="sm" className="text-xs">
                        View Result
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
