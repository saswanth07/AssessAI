"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { requestPasswordResetAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, ArrowLeft, MailCheck } from "lucide-react"

export function ForgotPasswordForm() {
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [message, setMessage] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)

    startTransition(async () => {
      const result = await requestPasswordResetAction(formData)
      setSubmitted(true)
      setMessage(result?.message || "If an account with that email exists, we've sent a password reset link.")
    })
  }

  if (submitted) {
    return (
      <Card className="shadow-lg border-muted">
        <CardHeader className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
            <MailCheck className="h-6 w-6" />
          </div>
          <CardTitle>Check Your Email</CardTitle>
          <CardDescription className="pt-2 text-sm leading-relaxed">
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center text-xs text-muted-foreground">
          The link will expire in 60 minutes. If you don&apos;t see the email, please check your spam folder.
        </CardContent>
        <CardFooter className="pt-2">
          <Link href="/login" className="w-full">
            <Button variant="outline" className="w-full">
              <ArrowLeft className="mr-2 h-4 w-4" /> Back to Sign In
            </Button>
          </Link>
        </CardFooter>
      </Card>
    )
  }

  return (
    <Card className="shadow-lg border-muted">
      <CardHeader>
        <CardTitle>Reset Password Request</CardTitle>
        <CardDescription>Enter your account email to receive a secure recovery link</CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Registered Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="e.g. student@karpagamtech.ac.in"
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
                Sending Reset Link...
              </>
            ) : (
              "Send Reset Link"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <Link href="/login" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
              <ArrowLeft className="h-3.5 w-3.5" /> Back to Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
