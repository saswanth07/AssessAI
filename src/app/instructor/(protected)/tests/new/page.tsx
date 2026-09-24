"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { z } from "zod"
import { useRouter } from "next/navigation"
import { createAssessment } from "@/app/actions/assessment"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const schema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters"),
  subject: z.string().min(2, "Subject is required"),
  topic: z.string().min(2, "Topic is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  duration: z.number().min(1, "Duration must be at least 1 minute")
})

type FormData = z.infer<typeof schema>

export default function NewAssessmentPage() {
  const router = useRouter()
  const [error, setError] = useState<string | null>(null)
  
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      difficulty: "MEDIUM",
      duration: 30
    }
  })

  async function onSubmit(data: FormData) {
    try {
      setError(null)
      const res = await createAssessment(data)
      if (res.success) {
        router.push(`/instructor/tests/${res.id}/edit`)
      }
    } catch (err: any) {
      setError(err.message || "Failed to create assessment")
    }
  }

  return (
    <div className="max-w-2xl mx-auto py-8">
      <Card>
        <CardHeader>
          <CardTitle>Create New Assessment</CardTitle>
          <CardDescription>Enter the basic details to start building your assessment.</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {error && <div className="text-red-500 text-sm">{error}</div>}
            
            <div className="space-y-2">
              <Label htmlFor="title">Assessment Title</Label>
              <Input id="title" {...register("title")} placeholder="e.g. Midterm React Exam" />
              {errors.title && <p className="text-sm text-red-500">{errors.title.message}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Input id="subject" {...register("subject")} placeholder="e.g. Computer Science" />
                {errors.subject && <p className="text-sm text-red-500">{errors.subject.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="topic">Topic</Label>
                <Input id="topic" {...register("topic")} placeholder="e.g. React Fundamentals" />
                {errors.topic && <p className="text-sm text-red-500">{errors.topic.message}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="difficulty">Difficulty</Label>
                <select 
                  id="difficulty" 
                  {...register("difficulty")}
                  className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <option value="EASY">Easy</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HARD">Hard</option>
                </select>
                {errors.difficulty && <p className="text-sm text-red-500">{errors.difficulty.message}</p>}
              </div>
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input id="duration" type="number" {...register("duration", { valueAsNumber: true })} />
                {errors.duration && <p className="text-sm text-red-500">{errors.duration.message}</p>}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Creating..." : "Create Draft"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
