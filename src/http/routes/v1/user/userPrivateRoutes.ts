import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.post(
	'/',
	validationMiddleware('userCreateUseCaseRules'),
	useCaseMiddleware('UserCreateUseCase')
)
router.get(
	'/',
	validationMiddleware('userGetUseCaseRules'),
	useCaseMiddleware('UserGetUseCase')
)

export { router as userPrivateRoutes }
