import { NextFunction, Request, Response } from 'express'
import { v4 as uuidv4 } from 'uuid'

/**
 * Middleware to Capture request data
 * @param req
 * @param _res
 * @param next
 * @returns
 */
export const requestDataMiddleware = (
	req: Request,
	_res: Response,
	next: NextFunction
) => {
	// Ignore unknown requests
	// E.g.: If an endpoint is executed in a browser, it will also try to GET '/favicon.ico'
	if (!req.originalUrl.startsWith('/api/')) return next()

	req.requestData = {
		id: uuidv4(),
		timestamp: new Date(),
		ip: req.ip,
		userAgent: req.headers['user-agent'],
		referer: req.headers['referer'],
		origin: req.headers['origin'],
		method: req.method,
		url: req.originalUrl
	}
	next()
}
