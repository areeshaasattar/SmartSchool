/**
 * Stub email sender — logs the would-be send.
 * TODO(feature/redis-bullmq): replace with SendGrid/SES integration
 */
export async function sendEmail(to: string, subject: string, body: string): Promise<boolean> {
  console.log(`📧 [EMAIL STUB] To: ${to}, Subject: ${subject}`)
  console.log(`   Body: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`)
  // Mark as sent in dev — real provider integration comes later
  return true
}
