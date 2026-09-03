import { Queue, type JobsOptions } from 'bullmq'
import Redis from 'ioredis'

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', { maxRetriesPerRequest: null })
// Redis clients should not keep short-lived CLI/test processes alive once all work is done.
connection.on('connect', () => {
  const stream = (connection as unknown as { connector?: { stream?: { unref?: () => void } } }).connector?.stream
  stream?.unref?.()
})
export const defaultJobOptions: JobsOptions = { attempts: 3, backoff: { type: 'exponential', delay: 1000 }, removeOnComplete: 500, removeOnFail: 1000 }
export const notificationsQueue = new Queue('notifications-queue', { connection, defaultJobOptions })
export const attendanceAlertsQueue = new Queue('attendance-alerts-queue', { connection, defaultJobOptions })
export const feeRemindersQueue = new Queue('fee-reminders-queue', { connection, defaultJobOptions })
export const pdfGenerationQueue = new Queue('pdf-generation-queue', { connection, defaultJobOptions })
export const importProcessingQueue = new Queue('import-processing-queue', { connection, defaultJobOptions })
export { connection as queueConnection }
