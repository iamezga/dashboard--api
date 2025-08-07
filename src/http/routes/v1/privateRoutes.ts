import { Router } from 'express'
import { examplePrivateRoutes } from './example'

const router = Router()

// Private global middlewares
// @example -> router.use(authMiddleware)

router.use('/example', examplePrivateRoutes)

export { router as privateRoutes }
