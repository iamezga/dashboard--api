import { Router } from 'express'
import { userPublicRoutes } from './user'

const router = Router()

router.use('/user', userPublicRoutes)

export { router as publicRoutes }
