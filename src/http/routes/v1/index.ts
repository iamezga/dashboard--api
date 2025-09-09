import { jobMiddleware } from '@/http/middlewares/jobMiddleware'
import { Router } from 'express'
import { authPublicRoutes } from './auth'
import { privateRoutes } from './privateRoutes'
import { publicRoutes } from './publicRoutes'

const router = Router()

// Global middlewares
router.use(jobMiddleware)
// Auth public routes
router.use('/auth', authPublicRoutes)
// Public routes
router.use('/', publicRoutes)
// Private routes
router.use('/private', privateRoutes)

export { router as v1 }
