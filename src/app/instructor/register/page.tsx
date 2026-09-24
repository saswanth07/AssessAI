import { InstructorRegisterForm } from "./instructor-register-form"

export default function InstructorRegisterPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/50 p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">Create Instructor Account</h1>
          <p className="text-muted-foreground mt-2">
            Instructor registration requires an authorized invitation code.
          </p>
        </div>
        <InstructorRegisterForm />
      </div>
    </div>
  )
}
