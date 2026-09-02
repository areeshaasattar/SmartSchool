import { Router } from 'express'
import authRoutes from '../modules/auth/routes/authRoutes.js'
import userRoutes from '../modules/auth/routes/userRoutes.js'
import schoolRoutes from '../modules/schools/routes/schoolRoutes.js'

const router = Router()

router.use('/auth', authRoutes)
router.use('/users', userRoutes)
router.use('/schools', schoolRoutes)

export default router
