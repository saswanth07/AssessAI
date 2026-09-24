"use client"

import React, { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Edit,
  Eye,
  BarChart2,
  Globe,
  Lock,
  Archive,
  Loader2,
  AlertTriangle
} from "lucide-react"
import Link from "next/link"
import { publishAssessment, closeAssessment, archiveAssessment } from "@/app/actions/assessment"

interface AssessmentActionsProps {
  testId: string
  status: "DRAFT" | "OPEN" | "CLOSED" | "ARCHIVED" | string
  submissionsCount: number
}

export function AssessmentListActions({ testId, status, submissionsCount }: AssessmentActionsProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [confirmAction, setConfirmAction] = useState<"publish" | "close" | "archive" | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const handleAction = (action: "publish" | "close" | "archive") => {
    setActionError(null)
    startTransition(async () => {
      let res
      if (action === "publish") {
        res = await publishAssessment(testId)
      } else if (action === "close") {
        res = await closeAssessment(testId)
      } else if (action === "archive") {
        res = await archiveAssessment(testId)
      }

      if (res?.success) {
        setConfirmAction(null)
        router.refresh()
      } else {
        setActionError(res?.error || "Action failed. Please try again.")
      }
    })
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {status !== "DRAFT" && (
          <Link href={`/instructor/tests/${testId}/results`}>
            <Button variant="secondary" size="sm" className="text-xs">
              <BarChart2 className="w-3.5 h-3.5 mr-1" />
              Results ({submissionsCount})
            </Button>
          </Link>
        )}

        <Link href={`/instructor/tests/${testId}/edit`}>
          <Button variant="outline" size="sm" className="text-xs">
            {status === "DRAFT" ? (
              <>
                <Edit className="w-3.5 h-3.5 mr-1" />
                Edit
              </>
            ) : (
              <>
                <Eye className="w-3.5 h-3.5 mr-1" />
                View
              </>
            )}
          </Button>
        </Link>

        {status === "DRAFT" && (
          <Button
            size="sm"
            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
            onClick={() => setConfirmAction("publish")}
          >
            <Globe className="w-3.5 h-3.5 mr-1" />
            Publish
          </Button>
        )}

        {status === "OPEN" && (
          <Button
            size="sm"
            variant="outline"
            className="text-xs text-amber-600 hover:text-amber-700 border-amber-200 hover:bg-amber-50 dark:border-amber-900"
            onClick={() => setConfirmAction("close")}
          >
            <Lock className="w-3.5 h-3.5 mr-1" />
            Close
          </Button>
        )}

        {status === "CLOSED" && (
          <Button
            size="sm"
            variant="ghost"
            className="text-xs text-slate-500 hover:text-slate-800"
            onClick={() => setConfirmAction("archive")}
          >
            <Archive className="w-3.5 h-3.5 mr-1" />
            Archive
          </Button>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-xl max-w-md w-full p-6 shadow-2xl border border-slate-200 dark:border-slate-800 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center space-x-2.5">
              <div className="w-9 h-9 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                  {confirmAction === "publish" && "Publish Assessment?"}
                  {confirmAction === "close" && "Close Assessment?"}
                  {confirmAction === "archive" && "Archive Assessment?"}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {confirmAction === "publish" && "This assessment will become available to all students for test-taking."}
                  {confirmAction === "close" && "Students will no longer be able to start new attempts on this assessment."}
                  {confirmAction === "archive" && "This assessment will be archived and hidden from student dashboards."}
                </p>
              </div>
            </div>

            {actionError && (
              <div className="text-xs text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/60 p-3 rounded-lg border border-red-200 dark:border-red-900">
                {actionError}
              </div>
            )}

            <div className="flex items-center justify-end space-x-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setConfirmAction(null)
                  setActionError(null)
                }}
                disabled={isPending}
              >
                Cancel
              </Button>
              <Button
                size="sm"
                disabled={isPending}
                className={
                  confirmAction === "publish"
                    ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                    : "bg-slate-900 hover:bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900"
                }
                onClick={() => handleAction(confirmAction)}
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />}
                {confirmAction === "publish" && "Yes, Publish"}
                {confirmAction === "close" && "Yes, Close"}
                {confirmAction === "archive" && "Yes, Archive"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
