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

export default router
