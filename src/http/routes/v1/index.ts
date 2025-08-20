import { jobMiddleware } from '@/http/middlewares/jobMiddleware'
import { Router } from 'express'
import { privateRoutes } from './privateRoutes'
import { publicRoutes } from './publicRoutes'

const router = Router()

// Global middlewares
router.use(jobMiddleware)
// Public routes
router.use('/', publicRoutes)
// Private routes
router.use('/private', privateRoutes)

export { router as v1 }
