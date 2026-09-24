import { Suspense } from "react"
import { ResetPasswordForm } from "./reset-password-form"
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Loader2 } from "lucide-react"

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Reset Your Password</h1>
          <p className="text-muted-foreground mt-2">
            Create a new password for your AssessAI account
          </p>
        </div>
        <Suspense
          fallback={
            <Card className="shadow-lg border-muted p-8 text-center">
              <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
              <p className="text-sm text-muted-foreground mt-2">Loading reset page...</p>
            </Card>
          }
        >
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  )
}
