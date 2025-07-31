require('@services/sentry')
import * as Sentry from '@sentry/node'
import config from '@services/config'
import { helmet } from '@services/helmet'
import cors from 'cors'
import express from 'express'
import { errorMiddleware } from './middleware/errorMiddleware'

const app = express()

app.use(helmet)
app.set('trust proxy', true)
app.use(cors({ origin: config.get('express.corsOrigin') }))
app.use(
	express.urlencoded({
		extended: true,
		limit: config.get('express.requestBodySize')
	})
)

app.get('/', (req, res) => {
	res.send('API is running!')
})

// handle error
app.use(errorMiddleware)
// Sentry error handler
if (config.get('sentry.dsn')) {
	Sentry.setupExpressErrorHandler(app)
}

export { app }
