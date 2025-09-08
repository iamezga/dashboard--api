import { NextFunction, Request, Response } from 'express'
import { randomUUID } from 'node:crypto'

interface RequestMiddlewareInputs {
	params?: boolean
	query?: boolean
	body?: boolean
	files?: boolean
}

/**
 * Middleware to Capture request data
 * @param req
 * @param _res
 * @param next
 * @returns
 */
export const requestDataMiddleware = (inputs: RequestMiddlewareInputs = {}) => {
	// default inputs
	inputs = {
		params: true,
		query: true,
		body: true,
		files: true,
		...inputs
	}

	return (req: Request, _res: Response, next: NextFunction) => {
		// Ignore unknown requests
		// E.g.: If an endpoint is executed in a browser, it will also try to GET '/favicon.ico'
		if (!req.originalUrl.startsWith('/api/')) return next()

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

		const {
			'g-recaptcha-response': recaptchaResponse,
			token,
			...payload
		} = inputData

		req.requestData = {
			id: <string>req.headers['x-job-id'] || randomUUID(),
			attempts: parseInt(<string>req.headers['x-job-attempts'] || '0') + 1,
			token,
			payload,
			recaptchaResponse,
			meta: {
				timestamp: new Date().getTime(),
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				referer: req.headers['referer'],
				origin: req.headers['origin'],
				method: req.method,
				url: req.originalUrl
			}
		}
		return next()
	}
}
