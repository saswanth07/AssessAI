import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function StudentTestLoading() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col animate-pulse">
      <header className="h-16 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between px-8">
        <div className="space-y-1">
          <div className="h-5 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-3 w-64 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="flex items-center space-x-3">
          <div className="h-9 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
          <div className="h-9 w-28 bg-emerald-100 dark:bg-emerald-950 rounded-md"></div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto p-8 grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 space-y-4">
          <Card className="shadow-sm">
            <CardHeader className="border-b">
              <div className="h-5 w-40 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="h-8 w-full bg-slate-200 dark:bg-slate-800 rounded"></div>
              <div className="space-y-3 pt-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-14 w-full bg-slate-100 dark:bg-slate-800 rounded-xl"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-4">
          <Card className="shadow-sm">
            <CardHeader>
              <div className="h-5 w-36 bg-slate-200 dark:bg-slate-800 rounded"></div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-5 gap-2">
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
                  <div key={i} className="h-10 bg-slate-100 dark:bg-slate-800 rounded-lg"></div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
