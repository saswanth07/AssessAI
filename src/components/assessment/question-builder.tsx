"use client"

import { useState } from "react"
import { useForm, useFieldArray } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { saveQuestions, publishAssessment, closeAssessment, archiveAssessment } from "@/app/actions/assessment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card"
import { Trash2, GripVertical, Copy, Plus, Sparkles } from "lucide-react"
import AIGenerator from "./ai-generator"
import AIReview from "./ai-review"
import { GeneratedQuestion } from "@/lib/ai/types"

const questionSchema = z.object({
  id: z.string().optional(),
  question: z.string().min(1, "Question text is required"),
  type: z.enum(["MCQ", "TRUE_FALSE"]),
  options: z.array(z.string().min(1, "Option cannot be empty")),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  topic: z.string().min(1, "Topic is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  explanation: z.string().optional(),
  order: z.number().int()
}).superRefine((data, ctx) => {
  if (data.type === "MCQ") {
    if (data.options.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "MCQ must have at least 2 options", path: ["options"] })
    }
    if (!data.options.includes(data.correctAnswer)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Correct answer must be one of the options", path: ["correctAnswer"] })
    }
  } else if (data.type === "TRUE_FALSE") {
    if (data.correctAnswer !== "True" && data.correctAnswer !== "False") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "True/False correct answer must be 'True' or 'False'", path: ["correctAnswer"] })
    }
  }
})

const formSchema = z.object({
  questions: z.array(questionSchema)
})

type FormData = z.infer<typeof formSchema>

interface Props {
  testId: string
  testTopic: string
  initialQuestions: any[]
  status: string
}

export default function QuestionBuilder({ testId, testTopic, initialQuestions, status }: Props) {
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  
  // Custom Popup States
  const [showPublishConfirm, setShowPublishConfirm] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false)
  const [customAlert, setCustomAlert] = useState<{message: string, isError: boolean, redirect?: string} | null>(null)
  
  // AI Review State
  const [reviewQuestions, setReviewQuestions] = useState<GeneratedQuestion[]>([])

  const isDraft = status === "DRAFT"

  const { register, control, handleSubmit, formState: { errors }, watch, setValue } = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      questions: initialQuestions.length > 0 ? initialQuestions : []
    }
  })

  const { fields, append, remove, move, insert } = useFieldArray({
    control,
    name: "questions"
  })

  const handleAddMCQ = () => {
    append({
      question: "",
      type: "MCQ",
      options: ["", "", "", ""],
      correctAnswer: "",
      topic: "",
      difficulty: "MEDIUM",
      order: fields.length
    })
  }

  const handleAddTF = () => {
    append({
      question: "",
      type: "TRUE_FALSE",
      options: ["True", "False"],
      correctAnswer: "True",
      topic: "",
      difficulty: "EASY",
      order: fields.length
    })
  }

  const duplicateQuestion = (index: number) => {
    const q = watch(`questions.${index}`)
    insert(index + 1, { ...q, id: undefined, order: index + 1 })
    updateOrder()
  }

  const updateOrder = () => {
    const currentQuestions = watch("questions")
    currentQuestions.forEach((_, i) => setValue(`questions.${i}.order`, i))
  }

  const handleMoveUp = (index: number) => {
    if (index > 0) {
      move(index, index - 1)
      updateOrder()
    }
  }

  const handleMoveDown = (index: number) => {
    if (index < fields.length - 1) {
      move(index, index + 1)
      updateOrder()
    }
  }

  const onSubmit = async (data: FormData) => {
    if (!isDraft) return
    setIsSaving(true)
    setSaveError(null)
    setSuccessMsg(null)
    try {
      data.questions.forEach((q, i) => q.order = i)
      const res = await saveQuestions(testId, data.questions)
      if (res.success) setSuccessMsg("Draft saved successfully!")
    } catch (err: any) {
      setSaveError(err.message || "Failed to save questions")
    }
    setIsSaving(false)
  }

  const onPublishSubmit = async (data: FormData) => {
    if (!isDraft) return
    setIsSaving(true)
    setSaveError(null)
    setSuccessMsg("Saving and publishing...")
    setShowPublishConfirm(false)
    
    // 1. Save draft first
    try {
      data.questions.forEach((q, i) => q.order = i)
      const saveRes = await saveQuestions(testId, data.questions)
      if (!saveRes.success) throw new Error("Failed to save draft before publishing")
    } catch (err: any) {
      setSaveError(err.message || "Failed to save questions")
      setSuccessMsg(null)
      setIsSaving(false)
      return
    }

    // 2. Publish
    try {
      const pubRes = await publishAssessment(testId)
      if (pubRes.success) {
        setCustomAlert({ message: "Assessment successfully published!", isError: false, redirect: "/instructor/dashboard" })
      } else {
        setSuccessMsg(null)
        setCustomAlert({ message: pubRes.error || "Failed to publish", isError: true })
      }
    } catch(err: any) {
      setCustomAlert({ message: err.message || "Failed to publish", isError: true })
      setSuccessMsg(null)
    }
    setIsSaving(false)
  }
  
  const handleClose = async () => {
    setShowCloseConfirm(false)
    try {
      setSuccessMsg("Closing...")
      const res = await closeAssessment(testId)
      if (res.success) {
        setCustomAlert({ message: "Assessment successfully closed!", isError: false })
        setSuccessMsg(null)
      } else {
        setSuccessMsg(null)
        setCustomAlert({ message: res.error || "Failed to close", isError: true })
      }
    } catch(err: any) {
      setCustomAlert({ message: err.message || "Failed to close", isError: true })
      setSuccessMsg(null)
    }
  }

  const handleArchive = async () => {
    setShowArchiveConfirm(false)
    try {
      setSuccessMsg("Archiving...")
      const res = await archiveAssessment(testId)
      if (res.success) {
        setCustomAlert({ message: "Assessment successfully archived!", isError: false, redirect: "/instructor/dashboard" })
      } else {
        setSuccessMsg(null)
        setCustomAlert({ message: res.error || "Failed to archive", isError: true })
      }
    } catch(err: any) {
      setCustomAlert({ message: err.message || "Failed to archive", isError: true })
      setSuccessMsg(null)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex justify-between items-center bg-white p-4 border rounded-lg shadow-sm sticky top-20 z-40">
        <div className="flex gap-2">
          {isDraft && (
            <>
              <Button type="button" onClick={handleAddMCQ} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1"/> Add MCQ</Button>
              <Button type="button" onClick={handleAddTF} variant="outline" size="sm"><Plus className="w-4 h-4 mr-1"/> Add True/False</Button>
              <AIGenerator 
                testId={testId} 
                defaultTopic={testTopic}
                onQuestionsGenerated={setReviewQuestions} 
              />
            </>
          )}
        </div>
        <div className="flex items-center gap-4">
          {saveError && <span className="text-red-500 text-sm font-medium">{saveError}</span>}
          {successMsg && <span className="text-green-600 text-sm font-medium">{successMsg}</span>}
          
          {isDraft && (
            <Button onClick={handleSubmit(onSubmit)} disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Draft"}
            </Button>
          )}
          {isDraft && (
            <Button onClick={() => setShowPublishConfirm(true)} variant="default" className="bg-green-600 hover:bg-green-700 text-white" disabled={isSaving}>Publish / Open</Button>
          )}
          {status === "OPEN" && (
            <Button onClick={() => setShowCloseConfirm(true)} variant="destructive">Close Assessment</Button>
          )}
          {status === "CLOSED" && (
            <Button onClick={() => setShowArchiveConfirm(true)} variant="secondary">Archive</Button>
          )}
        </div>
      </div>

      {/* Custom Popups */}
      {showPublishConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Publish Assessment?</h3>
            <p className="text-muted-foreground mb-6">This will automatically save your draft and publish it. Once published, questions cannot be edited.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowPublishConfirm(false)}>Cancel</Button>
              <Button onClick={handleSubmit(onPublishSubmit)} className="bg-green-600 hover:bg-green-700">Confirm & Publish</Button>
            </div>
          </div>
        </div>
      )}

      {showCloseConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Close Assessment?</h3>
            <p className="text-muted-foreground mb-6">Students will no longer be able to take it.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowCloseConfirm(false)}>Cancel</Button>
              <Button onClick={handleClose} variant="destructive">Close Assessment</Button>
            </div>
          </div>
        </div>
      )}

      {showArchiveConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-lg font-bold mb-2">Archive Assessment?</h3>
            <p className="text-muted-foreground mb-6">This will archive the assessment and remove it from active views.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowArchiveConfirm(false)}>Cancel</Button>
              <Button onClick={handleArchive} variant="secondary">Confirm Archive</Button>
            </div>
          </div>
        </div>
      )}

      {reviewQuestions.length > 0 && (
        <AIReview 
          testId={testId}
          initialQuestions={reviewQuestions}
          existingQuestionsContext={watch("questions").map(q => q.question)}
          onAccept={(q) => {
            append({
              question: q.question,
              type: q.type,
              options: q.type === "MCQ" ? q.options : ["True", "False"],
              correctAnswer: q.correctAnswer,
              topic: q.topic,
              difficulty: q.difficulty,
              explanation: q.explanation || "",
              order: fields.length
            } as any)
          }}
          onAcceptAll={(qs) => {
            const newFields = qs.map((q, i) => ({
              question: q.question,
              type: q.type,
              options: q.type === "MCQ" ? q.options : ["True", "False"],
              correctAnswer: q.correctAnswer,
              topic: q.topic,
              difficulty: q.difficulty,
              explanation: q.explanation || "",
              order: fields.length + i
            }))
            append(newFields as any)
            setReviewQuestions([])
          }}
          onCancel={() => setReviewQuestions([])}
        />
      )}

      {customAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full text-center">
            <h3 className={`text-lg font-bold mb-4 ${customAlert.isError ? 'text-red-600' : 'text-green-600'}`}>
              {customAlert.isError ? 'Error' : 'Success'}
            </h3>
            <p className="mb-6">{customAlert.message}</p>
            <Button onClick={() => {
              if (customAlert.redirect) {
                window.location.href = customAlert.redirect
              } else {
                setCustomAlert(null)
              }
            }} className="w-full">
              OK
            </Button>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {fields.length === 0 && (
          <div className="text-center py-20 border-2 border-dashed rounded-lg text-muted-foreground bg-white">
            No questions added yet. Start building your assessment!
          </div>
        )}

        {fields.map((field, index) => {
          const type = watch(`questions.${index}.type`)
          const qErrors = errors.questions?.[index]
          
          return (
            <Card key={field.id} className="relative">
              <div className="absolute left-0 top-0 bottom-0 w-8 bg-slate-50 border-r flex flex-col items-center justify-center gap-2 rounded-l-lg">
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveUp(index)} disabled={index === 0 || !isDraft}>↑</Button>
                <div className="text-xs font-bold text-slate-400">{index + 1}</div>
                <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={() => handleMoveDown(index)} disabled={index === fields.length - 1 || !isDraft}>↓</Button>
              </div>
              
              <div className="pl-12 pt-6 pb-6 pr-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex gap-4 w-full mr-4">
                     <div className="flex-1 space-y-2">
                       <Label>Question ({type})</Label>
                       <Input {...register(`questions.${index}.question`)} disabled={!isDraft} />
                       {qErrors?.question && <p className="text-red-500 text-xs">{qErrors.question.message}</p>}
                     </div>
                     <div className="w-1/4 space-y-2">
                       <Label>Topic</Label>
                       <Input {...register(`questions.${index}.topic`)} disabled={!isDraft} />
                       {qErrors?.topic && <p className="text-red-500 text-xs">{qErrors.topic.message}</p>}
                     </div>
                     <div className="w-1/4 space-y-2">
                       <Label>Difficulty</Label>
                       <select {...register(`questions.${index}.difficulty`)} disabled={!isDraft} className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50">
                         <option value="EASY">Easy</option>
                         <option value="MEDIUM">Medium</option>
                         <option value="HARD">Hard</option>
                       </select>
                     </div>
                  </div>
                  {isDraft && (
                    <div className="flex items-center gap-1">
                      <Button type="button" variant="ghost" size="icon" onClick={() => duplicateQuestion(index)}><Copy className="w-4 h-4 text-slate-500" /></Button>
                      <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                    </div>
                  )}
                </div>

                <div className="space-y-4">
                  <Label>Options & Correct Answer</Label>
                  {qErrors?.options && <p className="text-red-500 text-xs">{qErrors.options.message}</p>}
                  {qErrors?.correctAnswer && <p className="text-red-500 text-xs">{qErrors.correctAnswer.message}</p>}
                  
                  {type === "TRUE_FALSE" ? (
                    <div className="flex gap-4">
                      {["True", "False"].map((opt) => (
                        <label key={opt} className="flex items-center gap-2">
                          <input type="radio" value={opt} {...register(`questions.${index}.correctAnswer`)} disabled={!isDraft} />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {[0, 1, 2, 3].map(optIdx => {
                        const optVal = watch(`questions.${index}.options.${optIdx}`)
                        return (
                          <div key={optIdx} className="flex items-center gap-3">
                            <input 
                              type="radio" 
                              value={optVal || `opt_${optIdx}`} // Fallback value if empty so radio works
                              {...register(`questions.${index}.correctAnswer`)} 
                              checked={watch(`questions.${index}.correctAnswer`) === optVal && optVal !== ""}
                              disabled={!isDraft || !optVal}
                            />
                            <Input {...register(`questions.${index}.options.${optIdx}`)} disabled={!isDraft} placeholder={`Option ${optIdx + 1}`} />
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="mt-4 space-y-2">
                  <Label>Explanation (Optional)</Label>
                  <Input {...register(`questions.${index}.explanation`)} disabled={!isDraft} placeholder="Shown after assessment..." />
                </div>
              </div>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
