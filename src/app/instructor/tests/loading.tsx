import React from "react"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function TestsLoading() {
  return (
    <div className="flex flex-col gap-8 max-w-7xl mx-auto py-6 animate-pulse">
      <div className="flex items-center justify-between border-b pb-6">
        <div className="space-y-2">
          <div className="h-8 w-48 bg-slate-200 dark:bg-slate-800 rounded"></div>
          <div className="h-4 w-80 bg-slate-100 dark:bg-slate-800 rounded"></div>
        </div>
        <div className="h-10 w-36 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
      </div>

      <div className="grid gap-4">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="h-5 w-60 bg-slate-200 dark:bg-slate-800 rounded"></div>
                  <div className="h-3 w-40 bg-slate-100 dark:bg-slate-800 rounded"></div>
                </div>
                <div className="h-6 w-16 bg-slate-200 dark:bg-slate-800 rounded-full"></div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="h-4 w-48 bg-slate-100 dark:bg-slate-800 rounded"></div>
                <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 rounded-lg"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
