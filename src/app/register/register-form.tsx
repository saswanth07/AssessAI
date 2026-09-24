"use client"

import { useTransition, useState } from "react"
import Link from "next/link"
import { registerAction } from "@/app/actions/auth"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Loader2, GraduationCap } from "lucide-react"

const KARPAGAM_TECH_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@karpagamtech\.ac\.in$/i

export function RegisterForm() {
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)

    const formData = new FormData(event.currentTarget)
    const email = (formData.get("email") as string)?.trim().toLowerCase()
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string

    // Client-side domain validation
    if (!email || !KARPAGAM_TECH_EMAIL_REGEX.test(email)) {
      setError("Students must register using their Karpagam Tech institutional email (@karpagamtech.ac.in).")
      return
    }

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters long.")
      return
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.")
      return
    }

    startTransition(async () => {
      const result = await registerAction(formData)
      if (result?.error) {
        setError(result.error)
      }
    })
  }

  return (
    <Card className="shadow-lg border-muted">
      <CardHeader>
        <div className="flex items-center gap-2 text-primary font-medium text-xs mb-1 uppercase tracking-wider">
          <GraduationCap className="h-4 w-4" />
          <span>Student Portal</span>
        </div>
        <CardTitle>Create Student Account</CardTitle>
        <CardDescription>
          Enter your institutional details to register for assessments
        </CardDescription>
      </CardHeader>
      <form onSubmit={handleSubmit}>
        <CardContent className="space-y-4">
          {error && (
            <div className="p-3 text-sm text-destructive bg-destructive/10 rounded-md leading-relaxed">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Full Name</Label>
            <Input
              id="name"
              name="name"
              type="text"
              placeholder="e.g. John Doe"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="email">College Email Address</Label>
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                @karpagamtech.ac.in only
              </span>
            </div>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="e.g. 23cs001@karpagamtech.ac.in"
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              minLength={6}
              required
              disabled={isPending}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
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
                Creating Student Account...
              </>
            ) : (
              "Create Student Account"
            )}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-primary hover:underline">
              Sign In
            </Link>
          </div>
        </CardFooter>
      </form>
    </Card>
  )
}
