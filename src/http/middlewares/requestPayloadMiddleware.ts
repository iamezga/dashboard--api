import { UnauthorizedError } from '@/errors'
import { NextFunction, Request, RequestHandler, Response } from 'express'

interface RequestMiddlewareInputs {
	params?: boolean
	query?: boolean
	body?: boolean
	files?: boolean
}

/**
 * Middleware to consolidate user input (params, query, body, files) into a single payload.
 * Extracts data from req.params, req.query, req.body, and req.files according to configuration,
 * and stores it in the job object (res.locals.job) using job.setData().
 * Also extracts the 'g-recaptcha-response' field if present and stores it with job.setRecaptchaResponse().
 *
 * This middleware should be applied after route parameters are available (at the router or endpoint level).
 *
 * @param {RequestMiddlewareInputs} [inputs={}] - Configuration to specify which parts of the request to include.
 * @returns {RequestHandler} Express middleware function.
 */
export const requestPayloadMiddleware = (
	inputs: RequestMiddlewareInputs = {}
): RequestHandler => {
	// default inputs
	inputs = {
		params: true,
		query: true,
		body: true,
		files: true,
		...inputs
	}

	return (req: Request, res: Response, next: NextFunction) => {
		let inputData: Record<string, any> = {}

		// Consolidate the payload request data
		Object.keys(inputs).forEach(key => {
			if (
				inputs[<keyof RequestMiddlewareInputs>key] &&
				req[<keyof Request>key]
			) {
				inputData = structuredClone({
					...inputData,
					...(key == 'files'
						? { [key]: req[<keyof Request>key] }
						: { ...req[<keyof Request>key] })
				})
			}
		})

		const { 'g-recaptcha-response': recaptchaResponse, ...payload } = inputData

		const { job } = res.locals
		if (!job) {
			throw new UnauthorizedError('Authentication failed: missing job object.')
		}
		job.setData(payload)
		job.setRecaptchaResponse(recaptchaResponse)

		return next()
	}
}
