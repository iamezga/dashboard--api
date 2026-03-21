import { requestPayloadMiddleware } from '@/http/middlewares/requestPayloadMiddleware'
import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.get(
	'/:id',
	requestPayloadMiddleware(),
	validationMiddleware('userGetUseCaseRules'),
	useCaseMiddleware('UserGetUseCase')
)

export { router as userPublicRoutes }
