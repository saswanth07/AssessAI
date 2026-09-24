import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function AnalyticsLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto py-6 animate-pulse">
      <div className="border-b pb-6 space-y-2">
        <div className="h-8 w-64 bg-slate-200 dark:bg-slate-800 rounded"></div>
        <div className="h-4 w-96 bg-slate-100 dark:bg-slate-800 rounded"></div>
      </div>

      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-2">
              <div className="h-3 w-24 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="h-7 w-16 bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="h-3 w-32 bg-slate-100 dark:bg-slate-800 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
        <Card className="lg:col-span-8 shadow-sm">
          <CardHeader>
            <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
          </CardContent>
        </Card>
        <Card className="lg:col-span-4 shadow-sm">
          <CardHeader>
            <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full bg-slate-100 dark:bg-slate-800 rounded"></div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
