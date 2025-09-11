import { authLoggerMiddleware } from '@/http/middlewares/authLoggerMiddleware'
import { authMiddleware } from '@/http/middlewares/authMiddleware'
import { rateLimiterMiddleware } from '@/http/middlewares/rateLimiterMiddleware'
import { dependencyContainer } from '@/services/dependencyContainer'
import { Router } from 'express'
import { authPrivateRoutes } from './auth'
import { userPrivateRoutes } from './user'

const router = Router()

/**
 * @file privateRoutes.ts
 * @description Consolidates all private API routes for version 1.
 * These routes typically require authentication and authorization.
 */

// Apply the authentication middleware to all subsequent private routes.
// This middleware verifies the user's JWT and attaches their full entity to the Job context.
router.use(
	authMiddleware(dependencyContainer),
	authLoggerMiddleware,
	rateLimiterMiddleware(dependencyContainer, 200, 900) // 200 requests per 15 minutes
)

router.use('/auth', authPrivateRoutes)
router.use('/user', userPrivateRoutes)

export { router as privateRoutes }
