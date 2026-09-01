import { Router } from 'express'
import authRoutes from '../modules/auth/routes/authRoutes.js'

const router = Router()

router.use('/auth', authRoutes)

export default router
