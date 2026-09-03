import { Worker } from 'bullmq'
import { queueConnection } from '../../queues/index.js'
import { checkAttendanceThreshold } from '../../modules/attendance/services/attendanceService.js'
export const attendanceWorker = new Worker('attendance-alerts-queue', async (job) => checkAttendanceThreshold(job.data.schoolId, job.data.studentId, job.data.classId), { connection: queueConnection, concurrency: 3 })
attendanceWorker.on('failed', (job, error) => console.error(`[attendance-alerts-queue] job ${job?.id} failed`, error))
