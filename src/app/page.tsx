import Link from "next/link"
import { Button } from "@/components/ui/button"
import { BrainCircuit, Target, BarChart3 } from "lucide-react"

export default function LandingPage() {
  return (
    <div className="flex flex-col min-h-screen bg-slate-50 selection:bg-primary/30">
      <header className="sticky top-0 z-50 flex items-center justify-between px-6 py-4 border-b bg-white/80 backdrop-blur-md">
        <div className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900">
          <BrainCircuit className="h-8 w-8 text-primary" />
          AssessAI
        </div>
        <nav className="flex gap-4">
          <Link href="/login">
            <Button variant="ghost" className="font-semibold text-slate-600 hover:text-slate-900">Sign In</Button>
          </Link>
          <Link href="/login">
            <Button className="font-semibold shadow-sm">Get Started</Button>
          </Link>
        </nav>
      </header>
      
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-24 text-center">
        <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 border-transparent bg-primary/10 text-primary mb-8">
          Welcome to the future of education
        </div>
        
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-5xl text-balance text-slate-900 leading-tight">
          Create Smarter Assessments. <br/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-indigo-600">Understand Better Performance.</span>
        </h1>
        
        <p className="text-xl text-slate-600 mb-12 max-w-2xl text-balance leading-relaxed">
          The AI-powered assessment platform for modern education. Generate intelligent questions instantly and provide your students with personalized performance insights.
        </p>
        
        <div className="flex flex-col sm:flex-row gap-4 mb-24">
          <Link href="/login">
            <Button size="lg" className="w-full sm:w-auto font-semibold shadow-md px-8">
              Start for free
            </Button>
          </Link>
          <Button size="lg" variant="outline" className="w-full sm:w-auto font-semibold bg-white px-8">
            View Live Demo
          </Button>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4 text-left">
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
              <BrainCircuit className="h-6 w-6 text-primary" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">AI Generation</h3>
            <p className="text-slate-600">Instantly generate high-quality questions for any topic using advanced language models.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="h-12 w-12 bg-indigo-100 rounded-lg flex items-center justify-center mb-4">
              <Target className="h-6 w-6 text-indigo-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Precision Testing</h3>
            <p className="text-slate-600">Create detailed assessments with mixed question types and customized difficulty levels.</p>
          </div>
          <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
            <div className="h-12 w-12 bg-emerald-100 rounded-lg flex items-center justify-center mb-4">
              <BarChart3 className="h-6 w-6 text-emerald-600" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 mb-2">Deep Analytics</h3>
            <p className="text-slate-600">Track student progress with comprehensive insights and personalized AI-driven feedback.</p>
          </div>
        </div>
      </main>

      <footer className="border-t py-8 text-center text-sm text-slate-500 bg-white">
        <div className="flex items-center justify-center gap-2 mb-2">
          <BrainCircuit className="h-4 w-4" />
          <span className="font-semibold text-slate-700">AssessAI</span>
        </div>
        © {new Date().getFullYear()} AssessAI Platform. All rights reserved.
      </footer>
    </div>
  )
}
