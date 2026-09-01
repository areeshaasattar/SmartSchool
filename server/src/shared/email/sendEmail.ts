export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const emailFrom = process.env.EMAIL_FROM || 'noreply@smartschool.com'
  const nodeEnv = process.env.NODE_ENV || 'development'

  if (nodeEnv === 'development') {
    console.log('\n📧 [EMAIL STUB] Sending email:')
    console.log(`   From: ${emailFrom}`)
    console.log(`   To: ${options.to}`)
    console.log(`   Subject: ${options.subject}`)
    console.log(`   Body: ${options.html}`)
    console.log('📧 [END EMAIL STUB]\n')
    return
  }

  // TODO: Integrate real email provider (SendGrid, SES, etc.)
  console.log(`Email sending not configured for environment: ${nodeEnv}`)
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
