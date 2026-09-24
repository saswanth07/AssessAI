import { z } from "zod"

export type QuestionType = "MCQ" | "TRUE_FALSE"
export type Difficulty = "EASY" | "MEDIUM" | "HARD"

export interface GenerateQuestionsParams {
  topic: string;
  context: string;
  difficulty: Difficulty;
  count: number;
  type: QuestionType;
  existingQuestionsContext?: string[];
}

export const generatedMCQSchema = z.object({
  question: z.string().min(5, "Question text is required"),
  type: z.literal("MCQ"),
  options: z.array(z.string().min(1, "Option cannot be empty")).length(4, "MCQ must have exactly 4 options"),
  correctAnswer: z.string().min(1, "Correct answer is required"),
  topic: z.string().min(1, "Topic is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  explanation: z.string().optional(),
}).refine(data => data.options.includes(data.correctAnswer), {
  message: "Correct answer must exactly match one of the options",
  path: ["correctAnswer"]
});

export const generatedTFSchema = z.object({
  question: z.string().min(5, "Question text is required"),
  type: z.literal("TRUE_FALSE"),
  options: z.array(z.string()).length(2), // usually ["True", "False"]
  correctAnswer: z.enum(["True", "False"]),
  topic: z.string().min(1, "Topic is required"),
  difficulty: z.enum(["EASY", "MEDIUM", "HARD"]),
  explanation: z.string().optional(),
});

export const generatedQuestionsSchema = z.object({
  questions: z.array(z.union([generatedMCQSchema, generatedTFSchema]))
})

export type GeneratedQuestion = z.infer<typeof generatedMCQSchema> | z.infer<typeof generatedTFSchema>;

// ─── Phase 6: AI Performance Feedback Types ───────────────────────────────

export interface PerformanceFeedbackParams {
  assessmentTitle: string;
  subject: string;
  overallPercentage: number;
  correctCount: number;
  incorrectCount: number;
  unansweredCount: number;
  timeTakenSeconds: number;
  topicPerformance: Array<{
    topic: string;
    correct: number;
    total: number;
    percentage: number;
  }>;
}

export const aiImprovementAreaSchema = z.object({
  topic: z.string().min(1),
  explanation: z.string().min(1)
})

export const aiRecommendationSchema = z.object({
  topic: z.string().min(1),
  reason: z.string().min(1)
})

export const aiStudyPlanItemSchema = z.object({
  topic: z.string().min(1),
  action: z.string().min(1)
})

export const aiPerformanceFeedbackSchema = z.object({
  summary: z.string().min(10, "Summary must be at least 10 characters"),
  strengths: z.array(z.string().min(1)).min(0).max(10),
  improvementAreas: z.array(aiImprovementAreaSchema).min(0).max(10),
  recommendations: z.array(aiRecommendationSchema).min(0).max(10),
  studyPlan: z.array(aiStudyPlanItemSchema).min(0).max(10)
})

export type AIPerformanceFeedback = z.infer<typeof aiPerformanceFeedbackSchema>;

