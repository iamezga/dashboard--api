import { Router } from 'express'
import { userPrivateRoutes } from './user'

const router = Router()

// Private global middlewares
// @example -> router.use(authMiddleware)

router.use('/user', userPrivateRoutes)

export { router as privateRoutes }
