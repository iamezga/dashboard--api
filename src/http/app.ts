require('@services/sentry')
import config from '@/services/config'
import { helmet } from '@/services/helmet'
import * as Sentry from '@sentry/node'
import cors from 'cors'
import express from 'express'
import { errorMiddleware } from './middleware/errorMiddleware'
import { requestDataMiddleware } from './middleware/requestDataMiddleware'
import { initRoutes } from './routes'

const app = express()
app.set('trust proxy', true)

app.use(requestDataMiddleware)

app.use(helmet)
app.set('trust proxy', true)
app.use(cors({ origin: config.get('express.corsOrigin') }))
app.use(
	express.urlencoded({
		extended: true,
		limit: config.get('express.requestBodySize')
	})
)

// Initialize routes
initRoutes(app)

// handle error
app.use(errorMiddleware)
// Sentry error handler
if (config.get('sentry.dsn')) {
	Sentry.setupExpressErrorHandler(app)
}

export { app }
