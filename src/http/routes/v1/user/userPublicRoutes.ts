import { useCaseMiddleware } from '@/http/middleware/useCaseMiddleware'
import { validationMiddleware } from '@/http/middleware/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.get(
	'/',
	validationMiddleware('userGetUseCaseRules'),
	useCaseMiddleware('UserGetUseCase')
)

export { router as userPublicRoutes }
