import { jobMiddleware } from '@/http/middleware/jobMiddleware'
import { Router } from 'express'
import { authRoutes } from './authRoutes'
import { privateRoutes } from './privateRoutes'
import { publicRoutes } from './publicRoutes'

const router = Router()

// Global middlewares
router.use(jobMiddleware)

// Public routes
router.use('/', publicRoutes)
// Auth routes
router.use('/auth', authRoutes)
// Private routes
router.use('/private', privateRoutes)

export { router as v1 }
