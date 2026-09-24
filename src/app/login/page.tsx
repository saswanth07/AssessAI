import { Suspense } from "react"
import { LoginForm } from "./login-form"

export default function LoginPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Welcome to AssessAI</h1>
          <p className="text-muted-foreground mt-2">Sign in to your account</p>
        </div>
        <Suspense fallback={<div className="flex justify-center p-4">Loading...</div>}>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  )
}
