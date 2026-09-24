"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Sparkles, X, Loader2 } from "lucide-react"
import { generateAIQuestionsAction } from "@/app/actions/ai"
import { GeneratedQuestion, QuestionType, Difficulty } from "@/lib/ai/types"

interface AIGeneratorProps {
  testId: string
  defaultTopic: string
  onQuestionsGenerated: (questions: GeneratedQuestion[]) => void
}

export default function AIGenerator({ testId, defaultTopic, onQuestionsGenerated }: AIGeneratorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [isGenerating, setIsGenerating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [topic, setTopic] = useState(defaultTopic)
  const [difficulty, setDifficulty] = useState<Difficulty>("MEDIUM")
  const [type, setType] = useState<QuestionType>("MCQ")
  const [count, setCount] = useState(5)

  const handleGenerate = async () => {
    if (count < 1 || count > 20) {
      setError("Please request between 1 and 20 questions.")
      return
    }
    if (!topic.trim()) {
      setError("Topic is required.")
      return
    }

    setIsGenerating(true)
    setError(null)
    
    try {
      const res = await generateAIQuestionsAction({
        testId,
        topic,
        difficulty,
        type,
        count
      })

      if (res.success && res.questions) {
        onQuestionsGenerated(res.questions)
        setIsOpen(false)
      } else {
        setError(res.error || "Generation failed")
      }
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred")
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <>
      <Button type="button" onClick={() => setIsOpen(true)} className="bg-purple-600 hover:bg-purple-700 text-white" size="sm">
        <Sparkles className="w-4 h-4 mr-2" />
        Generate with AI
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col">
            <div className="flex justify-between items-center p-4 border-b bg-slate-50">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Generate Questions with AI
              </h2>
              <Button type="button" variant="ghost" size="icon" onClick={() => setIsOpen(false)} disabled={isGenerating}>
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <Label>Topic</Label>
                <Input value={topic} onChange={e => setTopic(e.target.value)} disabled={isGenerating} />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Difficulty</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={difficulty} 
                    onChange={e => setDifficulty(e.target.value as Difficulty)} 
                    disabled={isGenerating}
                  >
                    <option value="EASY">Easy</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HARD">Hard</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Question Type</Label>
                  <select 
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={type} 
                    onChange={e => setType(e.target.value as QuestionType)} 
                    disabled={isGenerating}
                  >
                    <option value="MCQ">Multiple Choice</option>
                    <option value="TRUE_FALSE">True / False</option>
                  </select>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Number of Questions (Max 20)</Label>
                <Input type="number" min="1" max="20" value={count} onChange={e => { const n = parseInt(e.target.value, 10); if (!isNaN(n)) setCount(n) }} disabled={isGenerating} />
              </div>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded text-sm font-medium">
                  {error}
                </div>
              )}
            </div>
            
            <div className="p-4 border-t bg-slate-50 flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} disabled={isGenerating}>Cancel</Button>
              <Button type="button" onClick={handleGenerate} disabled={isGenerating} className="bg-purple-600 hover:bg-purple-700">
                {isGenerating ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Generating...
                  </>
                ) : (
                  "Generate Questions"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
