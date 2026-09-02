import { Router } from 'express'
import authRoutes from '../modules/auth/routes/authRoutes.js'
import userRoutes from '../modules/auth/routes/userRoutes.js'
import schoolRoutes from '../modules/schools/routes/schoolRoutes.js'
import studentRoutes from '../modules/students/routes/studentRoutes.js'
import guardianRoutes from '../modules/students/routes/guardianRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/schools', schoolRoutes)
router.use('/students', studentRoutes)
router.use('/guardians', guardianRoutes)

export default router
