import { RegisterForm } from "./register-form"

export default function RegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create an Account</h1>
          <p className="text-muted-foreground mt-2">Get started with AssessAI</p>
        </div>
        <RegisterForm />
      </div>
    </div>
  )
}
