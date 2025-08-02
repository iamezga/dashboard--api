import { NotFoundError } from '@/errors'
import { Express } from 'express'
import { v1Router } from './v1'

export const initRoutes = (app: Express) => {
	//| API V1
	app.use('/api/v1', v1Router)

	// Fallback
	app.use((_req, _res) => {
		throw new NotFoundError('Route not found')
	})
}
