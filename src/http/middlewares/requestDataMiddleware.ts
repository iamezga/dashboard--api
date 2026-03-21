import { NextFunction, Request, RequestHandler, Response } from 'express'
import { randomUUID } from 'node:crypto'

/**
 * Middleware factory that creates a handler to consolidate request data.
 * It extracts metadata like IP, URL, headers, and client timezone (X-Timezone), etc.
 * @returns {RequestHandler} An Express middleware function.
 */
export const requestDataMiddleware = (): RequestHandler => {
	return (req: Request, _res: Response, next: NextFunction) => {
		// Ignore unknown requests
		// E.g.: If an endpoint is executed in a browser, it will also try to GET '/favicon.ico'
		if (!req.originalUrl.startsWith('/api/')) return next()

		req.requestData = {
			id: <string>req.headers['x-job-id'] || randomUUID(),
			attempts: parseInt(<string>req.headers['x-job-attempts'] || '0') + 1,
			token: req.headers.authorization?.split('Bearer ')[1],
			meta: {
				timestamp: new Date().getTime(),
				ip: req.ip,
				userAgent: req.headers['user-agent'],
				referer: req.headers['referer'],
				origin: req.headers['origin'],
				method: req.method,
				url: req.originalUrl,
				timezone: req.headers['x-timezone'] as string | undefined
			}
		}
		return next()
	}
}
