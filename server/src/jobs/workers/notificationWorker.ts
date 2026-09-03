import { Worker } from 'bullmq'
import { queueConnection } from '../../queues/index.js'
import { processNotification } from '../../modules/notifications/services/notificationService.js'
export const notificationWorker = new Worker('notifications-queue', async (job) => processNotification(job.data), { connection: queueConnection, concurrency: 5 })
notificationWorker.on('failed', (job, error) => console.error(`[notifications-queue] job ${job?.id} failed`, error))
