import { Queue, type JobsOptions } from 'bullmq'
import Redis from 'ioredis'

// lazyConnect: no socket/retry timers until the first job is queued — keeps
// test runs and short-lived CLI processes from hanging on an unreachable Redis.
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
})
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
export const aiIndexingQueue = new Queue('ai-indexing-queue', { connection, defaultJobOptions })
export { connection as queueConnection }

// Attach 'error' handlers so transient Redis failures (e.g. running tests or CLI
// commands without a Redis server) do not raise unhandled 'error' events or spam
// the console. Outside of tests the errors are logged.
const isTestEnv = process.env.NODE_ENV === 'test'
const logQueueError = (source: string, error: unknown) => {
  if (!isTestEnv) console.error(`[queues] ${source} error:`, error)
}
connection.on('error', (error) => logQueueError('redis', error))
for (const queue of [notificationsQueue, attendanceAlertsQueue, feeRemindersQueue, pdfGenerationQueue, importProcessingQueue, aiIndexingQueue]) {
  queue.on('error', (error) => logQueueError(queue.name, error))
}
