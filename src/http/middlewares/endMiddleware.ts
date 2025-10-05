import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'

/**
 * Middleware that logs the end of a request and calculates latency.
 * This should be the last middleware in the chain for a route.
 */
export const endMiddleware = (
	_req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { job } = res.locals
		if (!job) {
			// If the job is missing, we can't log anything meaningful.
			return next()
		}

		const jobLogger = job.logger as Logger
		const meta = job.getMeta()

		// Calculate request latency
		const latencyMs = Date.now() - meta.timestamp

		// Final log entry for the request
		jobLogger.info(
			{
				responseStatus: res.statusCode,
				responseMessage: res.statusMessage,
				latency: `${latencyMs}ms`
			},
			'Request completed.'
		)

		next()
	} catch (error) {
		// If an error occurs here, just pass it on.
		next(error)
	}
}
