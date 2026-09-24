import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StudentResultLoading() {
  return (
    <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-8 animate-pulse">
      <div className="flex justify-between border-b pb-6">
        <div className="space-y-2">
          <div className="h-4 w-40 bg-slate-100 dark:bg-slate-800 rounded"></div>
          <div className="h-8 w-72 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="h-9 w-28 bg-slate-200 dark:bg-slate-800 rounded"></div>
      </div>

      <div className="h-48 w-full bg-slate-900/80 rounded-2xl"></div>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-3 w-20 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </CardHeader>
            <CardContent>
              <div className="h-7 w-14 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="shadow-sm">
        <CardHeader>
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded"></div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
