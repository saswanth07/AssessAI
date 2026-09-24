import { Resend } from "resend"

interface SendPasswordResetEmailParams {
  to: string
  resetUrl: string
}

export async function sendPasswordResetEmail({ to, resetUrl }: SendPasswordResetEmailParams): Promise<{ success: boolean; error?: string }> {
  const apiKey = process.env.RESEND_API_KEY
  const fromEmail = process.env.EMAIL_FROM

  if (!apiKey || !fromEmail) {
    if (process.env.NODE_ENV === "production") {
      console.error("[Email Service] Missing RESEND_API_KEY or EMAIL_FROM in production environment.")
      throw new Error("Email service is not configured on the server.")
    } else {
      // Safe development warning — NEVER log raw token, reset URL, or secrets
      console.warn("[Email Service] Resend is not configured (missing RESEND_API_KEY or EMAIL_FROM in local environment). Reset email was not dispatched.")
      return { success: false, error: "Email provider not configured locally" }
    }
  }

  const resend = new Resend(apiKey)

  const subject = "Reset your AssessAI password"

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; margin: 0; padding: 32px 16px;">
  <table width="100%" border="0" cellspacing="0" cellpadding="0">
    <tr>
      <td align="center">
        <table width="100%" max-width="520" style="max-width: 520px; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; padding: 40px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <tr>
            <td align="center" style="padding-bottom: 24px;">
              <h1 style="margin: 0; font-size: 26px; font-weight: 700; color: #0f172a; letter-spacing: -0.5px;">AssessAI</h1>
              <p style="margin: 4px 0 0 0; font-size: 14px; color: #64748b;">Intelligent Assessment Platform</p>
            </td>
          </tr>
          <tr>
            <td style="padding: 16px 0; border-top: 1px solid #f1f5f9; border-bottom: 1px solid #f1f5f9;">
              <h2 style="margin: 0 0 16px 0; font-size: 18px; font-weight: 600; color: #1e293b;">Password Reset</h2>
              <p style="margin: 0 0 16px 0; font-size: 15px; line-height: 24px; color: #334155;">
                We received a request to reset your AssessAI password.
              </p>
              <p style="margin: 0 0 28px 0; font-size: 15px; line-height: 24px; color: #334155;">
                Click the button below to create a new password:
              </p>
              <div align="center" style="margin-bottom: 28px;">
                <a href="${resetUrl}" target="_blank" style="background-color: #0f172a; color: #ffffff; padding: 12px 32px; font-size: 15px; font-weight: 600; text-decoration: none; border-radius: 8px; display: inline-block; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                  Reset Password
                </a>
              </div>
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 20px; color: #64748b;">
                This link expires in 60 minutes.
              </p>
              <p style="margin: 0 0 12px 0; font-size: 14px; line-height: 20px; color: #64748b;">
                If you did not request a password reset, you can safely ignore this email.
              </p>
              <p style="margin: 0; font-size: 14px; line-height: 20px; color: #64748b;">
                For security, never share this link with anyone.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top: 24px; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #94a3b8;">
                &copy; ${new Date().getFullYear()} AssessAI. All rights reserved.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`

  const text = `AssessAI - Password Reset

We received a request to reset your AssessAI password.

Click or copy the link below to create a new password:
${resetUrl}

This link expires in 60 minutes.

If you did not request a password reset, you can safely ignore this email.
For security, never share this link with anyone.`

  try {
    const response = await resend.emails.send({
      from: fromEmail,
      to,
      subject,
      html,
      text,
    })

    if (response.error) {
      console.error("[Email Service] Resend API error:", response.error.message)
      return { success: false, error: response.error.message }
    }

    return { success: true }
  } catch (err: any) {
    console.error("[Email Service] Unexpected error sending email:", err.message)
    return { success: false, error: err.message }
  }
}
