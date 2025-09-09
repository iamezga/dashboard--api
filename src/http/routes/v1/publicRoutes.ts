import { rateLimiterMiddleware } from '@/http/middlewares/rateLimiterMiddleware'
import { dependencyContainer } from '@/services/dependencyContainer'
import { Router } from 'express'
import { userPublicRoutes } from './user'

const router = Router()

router.use(
	'/user',
	rateLimiterMiddleware(dependencyContainer, 100, 900), // 100 requests per 15 minutes
	userPublicRoutes
)

export { router as publicRoutes }
