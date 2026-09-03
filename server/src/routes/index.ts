import { Router } from 'express'
import authRoutes from '../modules/auth/routes/authRoutes.js'
import userRoutes from '../modules/auth/routes/userRoutes.js'
import schoolRoutes from '../modules/schools/routes/schoolRoutes.js'
import studentRoutes from '../modules/students/routes/studentRoutes.js'
import guardianRoutes from '../modules/students/routes/guardianRoutes.js'
import teacherRoutes from '../modules/teachers/routes/teacherRoutes.js'
import classRoutes from '../modules/classes/routes/classRoutes.js'
import subjectRoutes from '../modules/classes/routes/subjectRoutes.js'
import attendanceRoutes from '../modules/attendance/routes/attendanceRoutes.js'
import timetableRoutes from '../modules/timetables/routes/timetableRoutes.js'
import assignmentRoutes from '../modules/assignments/routes/assignmentRoutes.js'
import examRoutes from '../modules/exams/routes/examRoutes.js'
import parentPortalRoutes from '../modules/parent-portal/routes/portalRoutes.js'
import financeRoutes from '../modules/finance/routes/financeRoutes.js'
import messageRoutes from '../modules/communication/routes/messageRoutes.js'
import notificationRoutes from '../modules/notifications/routes/notificationRoutes.js'
import leaveRoutes from '../modules/leave/routes/leaveRoutes.js'
import disciplineRoutes from '../modules/discipline/routes/disciplineRoutes.js'
import transportRoutes from '../modules/transport/routes/transportRoutes.js'
import documentRoutes from '../modules/documents/routes/documentRoutes.js'
import analyticsRoutes from '../modules/analytics/routes/analyticsRoutes.js'
import auditRoutes from '../modules/audit/routes/auditRoutes.js'
import aiRoutes from '../modules/ai/routes/aiRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/schools', schoolRoutes)
router.use('/students', studentRoutes)
router.use('/guardians', guardianRoutes)
router.use('/teachers', teacherRoutes)
router.use('/classes', classRoutes)
router.use('/subjects', subjectRoutes)
router.use('/attendance', attendanceRoutes)
router.use('/timetable', timetableRoutes)
router.use('/assignments', assignmentRoutes)
router.use('/exams', examRoutes)
router.use('/parent-portal', parentPortalRoutes)
router.use('/fees', financeRoutes)
router.use('/messages', messageRoutes)
router.use('/notifications', notificationRoutes)
router.use('/leave', leaveRoutes)
router.use('/discipline', disciplineRoutes)
router.use('/transport', transportRoutes)
router.use('/documents', documentRoutes)
router.use('/analytics', analyticsRoutes)
router.use('/audit', auditRoutes)
router.use('/ai', aiRoutes)

export default router
