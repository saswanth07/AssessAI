import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StudentHistoryLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-6xl mx-auto py-6 animate-pulse">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="space-y-2">
          <div className="h-8 w-56 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="h-9 w-32 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </CardHeader>
        <CardContent>
          <div className="h-64 w-full bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
        </CardContent>
      </Card>
    </div>
  )
}
