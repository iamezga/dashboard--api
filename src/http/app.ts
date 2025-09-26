require('@/services/sentry')
import { config } from '@/services/config'
import * as Sentry from '@sentry/node'
import cors from 'cors'
import express from 'express'
import helmetBase from 'helmet'
import { errorMiddleware } from './middlewares/errorMiddleware'
import { requestDataMiddleware } from './middlewares/requestDataMiddleware'
import { initRoutes } from './routes'

const app = express()
app.set('trust proxy', true)

app.use(
	helmetBase({
		crossOriginResourcePolicy: false
	})
)
app.set('trust proxy', true)
app.use(cors({ origin: config.get('express.corsOrigin') }))
app.use(express.json({ limit: config.get('express.requestBodySize') }))
app.use(
	express.urlencoded({
		extended: true,
		limit: config.get('express.requestBodySize')
	})
)
app.use(requestDataMiddleware())

// Initialize routes
initRoutes(app)

// handle error
app.use(errorMiddleware)
// Sentry error handler
if (config.get('sentry.dsn')) {
	Sentry.setupExpressErrorHandler(app)
}

export { app }
