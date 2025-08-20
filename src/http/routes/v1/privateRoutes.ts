import { Router } from 'express'
import { authPrivateRoutes } from './auth'
import { userPrivateRoutes } from './user'

const router = Router()

// Private global middlewares
// @example -> router.use(authMiddleware)

router.use('/auth', authPrivateRoutes)
router.use('/user', userPrivateRoutes)

export { router as privateRoutes }
