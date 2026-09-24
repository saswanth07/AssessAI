"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Loader2, Trash2, Check, RefreshCw } from "lucide-react"
import { GeneratedQuestion, QuestionType, Difficulty } from "@/lib/ai/types"
import { regenerateAIQuestionAction } from "@/app/actions/ai"

interface AIReviewProps {
  testId: string
  initialQuestions: GeneratedQuestion[]
  existingQuestionsContext: string[] // to prevent duplicates on regenerate
  onAccept: (question: GeneratedQuestion) => void
  onAcceptAll: (questions: GeneratedQuestion[]) => void
  onCancel: () => void
}

export default function AIReview({ testId, initialQuestions, existingQuestionsContext, onAccept, onAcceptAll, onCancel }: AIReviewProps) {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>(initialQuestions)
  const [regeneratingIndex, setRegeneratingIndex] = useState<number | null>(null)
  
  if (questions.length === 0) return null

  const handleEdit = (index: number, field: keyof GeneratedQuestion, value: any) => {
    const updated = [...questions]
    updated[index] = { ...updated[index], [field]: value } as GeneratedQuestion
    setQuestions(updated)
  }

  const handleEditOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...questions]
    const q = updated[qIndex]
    if (q.type === "MCQ") {
      const newOptions = [...q.options]
      newOptions[optIndex] = value
      q.options = newOptions
      setQuestions(updated)
    }
  }

  const handleDelete = (index: number) => {
    const updated = [...questions]
    updated.splice(index, 1)
    setQuestions(updated)
    if (updated.length === 0) onCancel()
  }

  const handleAccept = (index: number) => {
    onAccept(questions[index])
    handleDelete(index)
  }

  const handleRegenerate = async (index: number) => {
    const q = questions[index]
    setRegeneratingIndex(index)
    try {
      const allContext = [...existingQuestionsContext, ...questions.map(qt => qt.question)]
      
      const res = await regenerateAIQuestionAction({
        testId,
        topic: q.topic,
        difficulty: q.difficulty as Difficulty,
        type: q.type as QuestionType,
        existingQuestionsContext: allContext
      })
      
      if (res.success && res.question) {
        const updated = [...questions]
        updated[index] = res.question
        setQuestions(updated)
      } else {
        alert(res.error || "Failed to regenerate")
      }
    } catch(err: any) {
      alert(err.message || "An error occurred during regeneration")
    } finally {
      setRegeneratingIndex(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-slate-50 rounded-xl shadow-2xl max-w-4xl w-full flex flex-col max-h-full">
        
        <div className="flex justify-between items-center p-4 border-b bg-white sticky top-0 z-10 rounded-t-xl shadow-sm">
          <h2 className="text-xl font-bold">Review AI Generated Questions ({questions.length})</h2>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onCancel}>Cancel All</Button>
            <Button onClick={() => onAcceptAll(questions)} className="bg-purple-600 hover:bg-purple-700">Accept All Remaining</Button>
          </div>
        </div>
        
        <div className="p-6 overflow-y-auto space-y-6">
          {questions.map((q, index) => (
            <Card key={index} className={`relative ${regeneratingIndex === index ? 'opacity-50 pointer-events-none' : ''}`}>
              {regeneratingIndex === index && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-white/50 rounded-lg">
                  <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
                </div>
              )}
              <CardHeader className="flex flex-row justify-between items-start bg-slate-50/50 pb-4">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-purple-600 uppercase tracking-wider">Generated Question {index + 1}</span>
                  <div className="flex gap-2 text-xs text-muted-foreground">
                    <span>{q.type}</span> • 
                    <span>{q.difficulty}</span> • 
                    <span>{q.topic}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleRegenerate(index)}><RefreshCw className="w-4 h-4 mr-1" /> Regenerate</Button>
                  <Button variant="outline" size="sm" onClick={() => handleDelete(index)} className="text-red-600 hover:text-red-700 hover:bg-red-50"><Trash2 className="w-4 h-4 mr-1" /> Delete</Button>
                  <Button variant="default" size="sm" onClick={() => handleAccept(index)} className="bg-green-600 hover:bg-green-700"><Check className="w-4 h-4 mr-1" /> Accept</Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6 space-y-4">
                <div className="space-y-2">
                  <Label>Question Text</Label>
                  <Input value={q.question} onChange={e => handleEdit(index, "question", e.target.value)} />
                </div>
                
                {q.type === "MCQ" && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-200">
                    <Label className="text-slate-500">Options</Label>
                    {q.options.map((opt, oIndex) => (
                      <div key={oIndex} className="flex items-center gap-2">
                        <Input value={opt} onChange={e => handleEditOption(index, oIndex, e.target.value)} />
                        <Button 
                          type="button"
                          variant={q.correctAnswer === opt ? "default" : "outline"}
                          className={q.correctAnswer === opt ? "bg-green-600 shrink-0" : "shrink-0"}
                          onClick={() => handleEdit(index, "correctAnswer", opt)}
                        >
                          {q.correctAnswer === opt ? "Correct Answer" : "Mark Correct"}
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {q.type === "TRUE_FALSE" && (
                  <div className="space-y-3 pl-4 border-l-2 border-slate-200">
                     <Label className="text-slate-500">Correct Answer</Label>
                     <div className="flex gap-2">
                        <Button 
                          type="button" 
                          variant={q.correctAnswer === "True" ? "default" : "outline"}
                          className={q.correctAnswer === "True" ? "bg-green-600" : ""}
                          onClick={() => handleEdit(index, "correctAnswer", "True")}
                        >True</Button>
                        <Button 
                          type="button" 
                          variant={q.correctAnswer === "False" ? "default" : "outline"}
                          className={q.correctAnswer === "False" ? "bg-green-600" : ""}
                          onClick={() => handleEdit(index, "correctAnswer", "False")}
                        >False</Button>
                     </div>
                  </div>
                )}
                
                <div className="grid grid-cols-2 gap-4 pt-2">
                   <div className="space-y-2">
                     <Label>Topic</Label>
                     <Input value={q.topic} onChange={e => handleEdit(index, "topic", e.target.value)} />
                   </div>
                   <div className="space-y-2">
                     <Label>Difficulty</Label>
                     <select 
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        value={q.difficulty} 
                        onChange={e => handleEdit(index, "difficulty", e.target.value as Difficulty)} 
                      >
                        <option value="EASY">EASY</option>
                        <option value="MEDIUM">MEDIUM</option>
                        <option value="HARD">HARD</option>
                      </select>
                   </div>
                </div>

                {q.explanation && (
                  <div className="space-y-2 pt-2">
                    <Label>Explanation</Label>
                    <Input value={q.explanation} onChange={e => handleEdit(index, "explanation", e.target.value)} />
                  </div>
                )}

              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
