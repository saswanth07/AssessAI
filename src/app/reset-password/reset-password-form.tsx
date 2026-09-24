"use client"

import { useTransition, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { completePasswordResetAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, CheckCircle2, AlertTriangle, ArrowLeft } from "lucide-react"

export function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <Card className="shadow-lg border-muted">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <CardTitle>Invalid Reset Link</CardTitle>
          <CardDescription className="pt-2 text-sm leading-relaxed">
            This password reset link is invalid or has expired. Please request a new one.
          </CardDescription>
        </CardHeader>
        <CardFooter className="flex flex-col space-y-2 pt-2">
          <Link href="/forgot-password" className="w-full">
            <Button className="w-full">Request New Reset Link</Button>
          </Link>
          <Link href="/login" className="w-full">
            <Button variant="ghost" className="w-full">Back to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  if (success) {
    return (
      <Card className="shadow-lg border-muted">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-400">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <CardTitle>Password Reset Successful</CardTitle>
          <CardDescription className="pt-2 text-sm leading-relaxed">
            Your password has been updated successfully.
          </CardDescription>
        </CardHeader>
        <CardFooter className="pt-2">
          <Link href="/login" className="w-full">
            <Button className="w-full">Continue to Sign In</Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    const formData = new FormData(event.currentTarget)
    formData.set("token", token)

    startTransition(async () => {
      const result = await completePasswordResetAction(formData)
      if (result?.error) {
        setError(result.error)
      } else if (result?.success) {
        setSuccess(true)
      }
    })
  }

  const isInvalidTokenError = error?.toLowerCase().includes("invalid") || error?.toLowerCase().includes("expired")

  return (
    <Card className="shadow-lg border-muted">
      <CardHeader>
        <CardTitle>Create New Password</CardTitle>
        <CardDescription>Enter a strong password with at least 6 characters</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm New Password</Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button className="w-full" type="submit" disabled={isPending}>
            {isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Resetting Password...
              </>
            ) : (
              "Reset Password"
            )}
          </Button>

          {isInvalidTokenError ? (
            <div className="text-center text-sm">
              <Link href="/forgot-password" className="font-semibold text-primary hover:underline">
                Request a new password reset link
              </Link>
            </div>
          ) : (
            <div className="text-center text-sm text-muted-foreground">
              <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
              </Link>
            </div>
          )}
        </CardFooter>
      </form>
    </Card>
  )
}
