import { rateLimiterMiddleware } from '@/http/middlewares/rateLimiterMiddleware'
import { requestPayloadMiddleware } from '@/http/middlewares/requestPayloadMiddleware'
import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.post(
	'/login',
	requestPayloadMiddleware(),
	rateLimiterMiddleware(5, 60, 300), // max 5 requests per 60 seconds with a block of 5mins if exceeded
	validationMiddleware('authLoginUseCaseRules'),
	useCaseMiddleware('AuthLoginUseCase')
)
router.post(
	'/password-recovery/request',
	requestPayloadMiddleware(),
	rateLimiterMiddleware(3, 60, 300), // max 3 requests per 60 seconds with a block of 5mins if exceeded
	validationMiddleware('authPasswordRecoveryRequestUseCaseRules'),
	useCaseMiddleware('AuthPasswordRecoveryRequestUseCase')
)
router.post(
	'/password-recovery/verify',
	requestPayloadMiddleware(),
	rateLimiterMiddleware(10, 60, 300), // max 10 requests per 60 seconds with a block of 5mins if exceeded
	validationMiddleware('authPasswordRecoveryVerifyUseCaseRules'),
	useCaseMiddleware('AuthPasswordRecoveryVerifyUseCase')
)
router.post(
	'/password-recovery/reset',
	requestPayloadMiddleware(),
	rateLimiterMiddleware(3, 60, 300), // max 3 requests per 60 seconds with a block of 5mins if exceeded
	validationMiddleware('authPasswordResetUseCaseRules'),
	useCaseMiddleware('AuthPasswordResetUseCase')
)

export { router as authPublicRoutes }
