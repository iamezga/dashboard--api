import { Router } from 'express'

const router = Router()

/**
 * Here you can define authentication routes like login, reset password, recover password, etc
 * @example
 * router.get(
 *     '/login',
 *     validationMiddleware('authLoginUseCaseRules'),
 *     useCaseMiddleware('authLoginUseCase')
 * )
 */

export { router as authRoutes }
