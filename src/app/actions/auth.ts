"use server"

import crypto from "crypto"
import { signIn, signOut } from "@/lib/auth"
import { AuthError } from "next-auth"
import { prisma } from "@/lib/db"
import bcrypt from "bcryptjs"
import { sendPasswordResetEmail } from "@/lib/email"

const KARPAGAM_TECH_EMAIL_REGEX = /^[A-Za-z0-9._%+-]+@karpagamtech\.ac\.in$/i
const GENERIC_RESET_RESPONSE = "If an account with that email exists, we've sent a password reset link."

export async function loginAction(formData: FormData) {
  try {
    const email = formData.get("email") as string
    
    // Find user role first so we can redirect properly
    const user = await prisma.user.findUnique({ where: { email } })
    const redirectTo = user?.role === "INSTRUCTOR" ? "/instructor/dashboard" : "/student/dashboard"
    
    await signIn("credentials", {
      ...Object.fromEntries(formData),
      redirectTo
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials." }
        default:
          return { error: "Something went wrong." }
      }
    }
    throw error
  }
}

export async function registerAction(formData: FormData) {
  try {
    const name = (formData.get("name") as string)?.trim()
    const rawEmail = (formData.get("email") as string)?.trim()
    const password = formData.get("password") as string
    const confirmPassword = formData.get("confirmPassword") as string
    
    // Public registrations are strictly for STUDENT role
    const role = "STUDENT"

    if (!name || name.length < 2) {
      return { error: "Name must be at least 2 characters long." }
    }

    if (!rawEmail || !KARPAGAM_TECH_EMAIL_REGEX.test(rawEmail)) {
      return { error: "Students must register using their Karpagam Tech institutional email (@karpagamtech.ac.in)." }
    }

    // Normalize email before database queries and storage
    const email = rawEmail.toLowerCase()

    if (!password || password.length < 6) {
      return { error: "Password must be at least 6 characters long." }
    }

    if (password !== confirmPassword) {
      return { error: "Passwords do not match." }
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return { error: "An account with this email already exists. Please sign in." }
    }

    const hashedPassword = await bcrypt.hash(password, 10)

    await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        role,
      },
    })

    await signIn("credentials", {
      email,
      password,
      redirectTo: "/student/dashboard",
    })
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Account created, but automatic sign-in failed. Please sign in manually." }
        default:
          return { error: "Something went wrong during sign-in." }
      }
    }
    // Re-throw Next.js redirect navigation errors
    if ((error as any)?.message?.includes("NEXT_REDIRECT")) {
      throw error
    }
    console.error("[Auth] Registration error:", (error as any)?.message || error)
    return { error: (error as any)?.message || "Failed to create account. Please try again." }
  }
}

/**
 * Initiates the password reset flow.
 * Always returns a generic success message to prevent user enumeration.
 */
export async function requestPasswordResetAction(formData: FormData) {
  try {
    const rawEmail = (formData.get("email") as string)?.trim()
    if (!rawEmail || !rawEmail.includes("@")) {
      return { success: true, message: GENERIC_RESET_RESPONSE }
    }

    const email = rawEmail.toLowerCase()
    const user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // 1. Invalidate any existing active tokens for this user
      await prisma.passwordResetToken.deleteMany({
        where: { userId: user.id },
      })

      // 2. Generate a cryptographically secure random token (raw)
      const rawToken = crypto.randomBytes(32).toString("hex")

      // 3. Compute SHA-256 hash for database storage (never store raw token)
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex")

      // 4. Set 60-minute expiry
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

      await prisma.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
      })

      // 5. Construct canonical password reset URL
      const baseUrl = (process.env.AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000").replace(/\/$/, "")
      const resetUrl = `${baseUrl}/reset-password?token=${rawToken}`

      // 6. Send the email via Resend (NEVER log the raw token or full reset URL)
      await sendPasswordResetEmail({
        to: user.email,
        resetUrl,
      })
    }

    return { success: true, message: GENERIC_RESET_RESPONSE }
  } catch (error) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Auth] Password reset request error in production.")
      return { error: "An error occurred while processing your request. Please try again." }
    }
    console.warn("[Auth] Safe reset warning:", (error as any)?.message || "Email dispatch failed")
    return { success: true, message: GENERIC_RESET_RESPONSE }
  }
}

/**
 * Verifies that a reset token exists and has not expired.
 */
export async function verifyResetTokenAction(token: string) {
  if (!token || typeof token !== "string" || token.length < 10) {
    return { valid: false, error: "This password reset link is invalid or has expired. Please request a new one." }
  }

  try {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true } } },
    })

    if (!record || record.expiresAt < new Date() || !record.user) {
      return { valid: false, error: "This password reset link is invalid or has expired. Please request a new one." }
    }

    return { valid: true }
  } catch (error) {
    console.error("[Auth] Token verification error:", (error as any)?.message)
    return { valid: false, error: "This password reset link is invalid or has expired. Please request a new one." }
  }
}

/**
 * Completes the password reset by validating the token and updating the user's password.
 */
export async function completePasswordResetAction(formData: FormData) {
  try {
    const token = formData.get("token") as string
    const newPassword = formData.get("newPassword") as string
    const confirmPassword = formData.get("confirmPassword") as string

    if (!token) {
      return { error: "This password reset link is invalid or has expired. Please request a new one." }
    }

    if (!newPassword || newPassword.length < 6) {
      return { error: "Password must be at least 6 characters long." }
    }

    if (newPassword !== confirmPassword) {
      return { error: "Passwords do not match." }
    }

    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const record = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: { select: { id: true, email: true } } },
    })

    if (!record || record.expiresAt < new Date() || !record.user) {
      return { error: "This password reset link is invalid or has expired. Please request a new one." }
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10)

    // Atomic update: update password and invalidate all reset tokens for this user
    await prisma.$transaction([
      prisma.user.update({
        where: { id: record.userId },
        data: { password: hashedPassword },
      }),
      prisma.passwordResetToken.deleteMany({
        where: { userId: record.userId },
      }),
    ])

    return { success: true, message: "Your password has been reset successfully." }
  } catch (error) {
    console.error("[Auth] Password reset completion error:", (error as any)?.message)
    return { error: (error as any)?.message || "Failed to reset password. Please try again." }
  }
}

export async function logoutAction() {
  await signOut()
}

