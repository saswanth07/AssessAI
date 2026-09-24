"use server"

import bcrypt from "bcryptjs"
import { prisma } from "@/lib/db"

export async function registerInstructorAction(formData: FormData) {
  try {
    const name = (formData.get("name") as string)?.trim()
    const rawEmail = (formData.get("email") as string)?.trim()
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    const registrationCode = formData.get("registrationCode") as string

    if (!name || name.length < 2) {
      return { error: "Invalid registration details." }
    }

    if (!rawEmail || !rawEmail.includes("@")) {
      return { error: "Invalid registration details." }
    }

    const email = rawEmail.toLowerCase()

    if (!password || password.length < 6) {
      return { error: "Invalid registration details." }
    }

    if (password !== confirmPassword) {
      return { error: "Invalid registration details." }
    }

    if (!registrationCode) {
      return { error: "Invalid registration details." }
    }

    const validCode = process.env.INSTRUCTOR_SIGNUP_CODE
    if (!validCode || registrationCode !== validCode) {
      return { error: "Invalid registration details." }
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { error: "Invalid registration details." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role: "INSTRUCTOR",
      },
    })

    return { success: true }
  } catch (error) {
    console.error("[Instructor Auth] Registration error:", (error as any)?.message || error)
    return { error: "Invalid registration details." }
  }
}
