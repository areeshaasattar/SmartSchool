import { Resend } from 'resend'

// Lazy singleton — Resend is created on first use so that process.env
// is read *after* dotenv.config() has run (ES module imports are hoisted
// before the calling module's top-level code executes).
let resend: Resend | null = null

function getResendClient(): Resend | null {
  if (resend) return resend

  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    return null
  }

  resend = new Resend(apiKey)
  return resend
}

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const emailFrom = process.env.EMAIL_FROM || 'noreply@smartschool.com'
  const client = getResendClient()

  if (!client) {
    console.warn(`📧 [EMAIL SKIPPED] RESEND_API_KEY not set. Would send to: ${options.to}, subject: ${options.subject}`)
    return
  }

  try {
    const { error } = await client.emails.send({
      from: emailFrom,
      to: options.to,
      subject: options.subject,
      html: options.html,
    })

    if (error) {
      console.error('📧 [EMAIL ERROR] Resend failed:', error.message)
      throw new Error(`Failed to send email: ${error.message}`)
    }

    console.log(`📧 [EMAIL SENT] To: ${options.to}, Subject: ${options.subject}`)
  } catch (error) {
    console.error('📧 [EMAIL ERROR] Failed to send email:', error instanceof Error ? error.message : error)
    throw error
  }
}

export function buildVerificationEmail(verificationUrl: string): { subject: string; html: string } {
  return {
    subject: 'Verify your SmartSchool account',
    html: `
      <h1>Welcome to SmartSchool!</h1>
      <p>Please verify your email address by clicking the link below:</p>
      <p><a href="${verificationUrl}">Verify Email</a></p>
      <p>This link will expire in 24 hours.</p>
      <p>If you did not create an account, please ignore this email.</p>
    `,
  }
}

export function buildPasswordResetEmail(resetUrl: string): { subject: string; html: string } {
  return {
    subject: 'Reset your SmartSchool password',
    html: `
      <h1>Password Reset Request</h1>
      <p>You requested to reset your password. Click the link below to proceed:</p>
      <p><a href="${resetUrl}">Reset Password</a></p>
      <p>This link will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email.</p>
    `,
  }
}
