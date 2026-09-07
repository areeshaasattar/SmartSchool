import dotenv from 'dotenv'
import { connectDatabase } from './config/database.js'
import './jobs/workers/notificationWorker.js'
import './jobs/workers/attendanceWorker.js'
import './jobs/workers/aiIndexingWorker.js'
import { feeRemindersQueue } from './queues/index.js'
dotenv.config()
async function startWorker() { await connectDatabase(process.env.MONGO_URI || 'mongodb://root:rootpassword@localhost:27017/smartschool?authSource=admin'); await feeRemindersQueue.upsertJobScheduler('daily-fee-reminders', { pattern: '0 7 * * *' }, { name: 'scan-reminders', data: {} }); console.log('SmartSchool workers started') }
startWorker().catch((error) => { console.error('Worker startup failed', error); process.exit(1) })
