import { ReactNode } from "react"
import { auth } from "@/lib/auth"
import { redirect } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { SignOutButton } from "@/components/auth/signout-button"

export default async function StudentLayout({ children }: { children: ReactNode }) {
  const session = await auth()
  
  if (!session || session.user.role !== "STUDENT") {
    redirect("/login")
  }

  return (
    <div className="min-h-screen flex flex-col bg-muted/20">
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center px-4 justify-between">
          <div className="flex items-center gap-6 md:gap-10">
            <Link href="/" className="flex items-center space-x-2">
              <span className="font-bold text-xl tracking-tight">AssessAI</span>
              <span className="rounded-md bg-primary/10 px-1.5 py-0.5 text-xs font-medium text-primary hidden sm:inline-block">Student</span>
            </Link>
            <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
              <Link href="/student/dashboard" className="transition-colors hover:text-primary text-foreground">Dashboard</Link>
              <Link href="/student/history" className="transition-colors hover:text-primary text-muted-foreground">History</Link>
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground hidden sm:inline-block">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="flex-1 container mx-auto p-4 md:p-8">
        {children}
      </main>
    </div>
  )
}
