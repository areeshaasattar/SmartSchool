/**
 * Stub push notification sender — logs the would-be send.
 * TODO(feature/redis-bullmq): replace with FCM/APNs integration
 */
export async function sendPush(userId: string, title: string, body: string): Promise<boolean> {
  console.log(`📱 [PUSH STUB] To user: ${userId}, Title: ${title}`)
  console.log(`   Body: ${body.substring(0, 200)}${body.length > 200 ? '...' : ''}`)
  return true
}
