import { Job } from '@/lib/Job'
import logger from '@/services/logger'
import { NextFunction, Request, Response } from 'express'

/**
 * Middleware to create and initialize the Job instance.
 * It reads the consolidated request data from `req.requestData`
 * and populates a new Job instance, which is then attached to `res.locals`.
 */
export const jobMiddleware = (
	req: Request,
	res: Response,
	next: NextFunction
) => {
	// We'll need the requestData from the previous middleware.
	// If it's missing, something went wrong in the middleware chain.
	if (!req.requestData) {
		return next(
			new Error('`requestDataMiddleware` must be run before `jobMiddleware`.')
		)
	}

	const {
		id,
		attempts,
		payload: data,
		recaptchaResponse,
		meta
	} = req.requestData

	// Create a new Job instance with basic request data.
	const job = new Job({ id, attempts, data, recaptchaResponse, meta, logger })

	// Attach the Job to res.locals so it's accessible by the next middlewares
	res.locals.job = job

	// Set response headers for traceability.
	res.set({
		'x-job-id': job.getId(),
		'x-job-attempts': job.getAttempts(),
		'x-job-progress': job.getProgress()
	})

	return next()
}
