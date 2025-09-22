import { rateLimiterMiddleware } from '@/http/middlewares/rateLimiterMiddleware'
import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.post(
	'/login',
	rateLimiterMiddleware(5, 60, 300), // max 5 requests per 60 seconds with a block of 5mins if exceeded
	validationMiddleware('authLoginUseCaseRules'),
	useCaseMiddleware('AuthLoginUseCase')
)

export { router as authPublicRoutes }
