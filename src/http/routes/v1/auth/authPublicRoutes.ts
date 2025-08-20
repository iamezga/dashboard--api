import { sendJsonMiddleware } from '@/http/middlewares/sendJsonMiddleware'
import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.post(
	'/login',
	validationMiddleware('authLoginUseCaseRules'),
	useCaseMiddleware('AuthLoginUseCase'),
	sendJsonMiddleware
)

export { router as authPublicRoutes }
