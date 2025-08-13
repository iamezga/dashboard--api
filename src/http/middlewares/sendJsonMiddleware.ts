import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { NextFunction, Request, Response } from 'express'

/**
 * Middleware responsible for formatting and sending the final response to the client.
 */
export const sendJsonMiddleware = (
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	const job = res.locals.job as JobInterface
	const useCaseResponse = res.locals.useCaseResponse as UseCaseResponseInterface

	return res.status(200).json({
		jobId: job.getId(),
		data: useCaseResponse.data,
		metadata: useCaseResponse.metadata,
		user: job.getPublicUser()
	})
}
