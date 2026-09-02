/**
 * Stub SMS sender — logs the would-be send.
 * TODO(feature/redis-bullmq): replace with Twilio integration
 */
export async function sendSms(phone: string, message: string): Promise<boolean> {
  console.log(`💬 [SMS STUB] To: ${phone}`)
  console.log(`   Message: ${message.substring(0, 200)}${message.length > 200 ? '...' : ''}`)
  return true
}
