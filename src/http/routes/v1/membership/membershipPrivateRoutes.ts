import { requestPayloadMiddleware } from '@/http/middlewares/requestPayloadMiddleware'
import { useCaseMiddleware } from '@/http/middlewares/useCaseMiddleware'
import { validationMiddleware } from '@/http/middlewares/validationMiddleware'
import { Router } from 'express'

const router = Router()

router.get(
	'/select/:id',
	requestPayloadMiddleware(),
	validationMiddleware('membershipSelectUseCaseRules'),
	useCaseMiddleware('MembershipSelectUseCase')
)

export { router as membershipPrivateRoutes }
