import { NextFunction, Request, Response } from 'express'

/**
 * Middleware responsible for formatting and sending the final response to the client.
 */
export const sendJsonMiddleware = (
	_req: Request,
	res: Response,
	next: NextFunction
) => {
	const { job, useCaseResponse } = res.locals

	if (useCaseResponse) {
		return res.status(200).json({
			jobId: job.getId(),
			data: useCaseResponse!.data,
			metadata: useCaseResponse!.metadata
		})
	}
	next()
}
