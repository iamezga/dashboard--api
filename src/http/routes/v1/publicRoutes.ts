import { Router } from 'express'
import { authPublicRoutes } from './auth'
import { userPublicRoutes } from './user'

const router = Router()

router.use('/auth', authPublicRoutes)
router.use('/user', userPublicRoutes)

export { router as publicRoutes }
