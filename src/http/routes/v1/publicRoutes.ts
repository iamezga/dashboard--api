import { Router } from 'express'
import { examplePublicRoutes } from './example'

const router = Router()

router.use('/example', examplePublicRoutes)

export { router as publicRoutes }
