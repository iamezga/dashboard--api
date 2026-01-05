import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.post(
	'/logout',
	validationMiddleware('authLogoutUseCaseRules'),
	useCaseMiddleware('AuthLogoutUseCase')
)

export { router as authPrivateRoutes }
