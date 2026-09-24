"use client"

import React, { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Play, RotateCw, CheckCircle2 } from "lucide-react"
import { startOrResumeAttempt } from "@/app/actions/student-test"
import Link from "next/link"

interface StartTestButtonProps {
  testId: string
  status: "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED"
  attemptId?: string
}

export function StartTestButton({ testId, status, attemptId }: StartTestButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (status === "COMPLETED") {
    return (
      <Link href={`/student/tests/${testId}/result${attemptId ? `?attemptId=${attemptId}` : ""}`}>
        <Button
          variant="outline"
          size="sm"
          className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 dark:border-emerald-800 dark:text-emerald-400"
        >
          <CheckCircle2 className="w-3.5 h-3.5 mr-1.5" />
          View Result
        </Button>
      </Link>
    )
  }

  const handleStartOrResume = async () => {
    setIsLoading(true)
    setError(null)

    try {
      console.log("[START_TEST] CLICK")
      console.log("[START_TEST] BEFORE_ACTION")

      const result = await startOrResumeAttempt(testId)

      console.log("[START_TEST] AFTER_ACTION", result)

      if (!result?.success) {
        setError("error" in result && result.error ? String(result.error) : "Unable to start test")
        setIsLoading(false)
        return
      }

      console.log("[START_TEST] BEFORE_NAVIGATION")
      
      const targetUrl = "status" in result && result.status === "COMPLETED" && "attemptId" in result
        ? `/student/tests/${testId}/result?attemptId=${result.attemptId}`
        : `/student/tests/${testId}`
        
      window.location.assign(targetUrl)
      
      console.log("[START_TEST] AFTER_NAVIGATION")
    } catch (err: any) {
      console.error("[START_TEST] ERROR", err)
      setError("Unable to start test")
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col items-end">
      {status === "IN_PROGRESS" ? (
        <Button
          size="sm"
          type="button"
          onClick={handleStartOrResume}
          disabled={isLoading}
          className="bg-amber-600 hover:bg-amber-700 text-white"
        >
          {isLoading ? (
            "Resuming..."
          ) : (
            <>
              <RotateCw className="w-3.5 h-3.5 mr-1.5 animate-spin-reverse" />
              Resume Test
            </>
          )}
        </Button>
      ) : (
        <Button
          size="sm"
          type="button"
          onClick={handleStartOrResume}
          disabled={isLoading}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          {isLoading ? (
            "Starting..."
          ) : (
            <>
              <Play className="w-3.5 h-3.5 mr-1.5 fill-current" />
              Start Test
            </>
          )}
        </Button>
      )}

      {error && (
        <span className="text-[11px] text-red-600 mt-1 max-w-[200px] text-right font-medium">
          {error}
        </span>
      )}
    </div>
  )
}
