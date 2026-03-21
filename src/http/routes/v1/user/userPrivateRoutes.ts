import { permissionMiddleware } from '@/http/middlewares/permissionMiddleware'
import { requestPayloadMiddleware } from '@/http/middlewares/requestPayloadMiddleware'
import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.post(
	'/',
	requestPayloadMiddleware(),
	validationMiddleware('userCreateUseCaseRules'),
	permissionMiddleware('UserCreateUseCase'),
	useCaseMiddleware('UserCreateUseCase')
)
router.get(
	'/:id',
	requestPayloadMiddleware(),
	validationMiddleware('userGetUseCaseRules'),
	useCaseMiddleware('UserGetUseCase')
)

export { router as userPrivateRoutes }
