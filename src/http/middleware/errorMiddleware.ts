import {
	BadRequestError,
	ForbiddenError,
	HttpStatusCode,
	NotFoundError,
	UnauthorizedError
} from '@/errors'
import { Job } from '@/lib/Job'
import config from '@/services/config'
import logger from '@/services/logger'
import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'fastest-validator'
import crypto from 'node:crypto'

type HandledError =
	| BadRequestError
	| ForbiddenError
	| NotFoundError
	| UnauthorizedError
	| Error

export const errorMiddleware = async (
	err: HandledError,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	const job = res.locals.job as Job | undefined
	const errorId = crypto.randomUUID()

	let statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR
	let message = 'An unexpected error has occurred.'
	let errorName = 'Internal Server Error'
	let errors: ValidationError[] = []
	let stack: string | undefined

	if (
		err instanceof BadRequestError ||
		err instanceof ForbiddenError ||
		err instanceof NotFoundError ||
		err instanceof UnauthorizedError
	) {
		statusCode = err.statusCode
		message = err.message
		errorName = err.name
		if (err instanceof BadRequestError && err.errors) {
			errors = err.errors
		}
	} else {
		// Error >= 500 (or not handled)
		errorName = 'InternalServerError'
		if (config.get('env') !== 'production') {
			message = err.message || message
			stack = err.stack
		}

		if (config.get('sentry.dsn')) {
			// Set sentry scope
			Sentry.withScope(scope => {
				scope.setTag('errorId', errorId)
				if (job) {
					scope.setTag('job.id', job.getId())
					scope.setUser(job.getPublicUser() || {})
					scope.setExtra('job.meta', job.getMeta())
					scope.setExtra('job.data', job.getData())
				}
				Sentry.captureException(err)
			})
		}
	}

	const logData = {
		errorId,
		jobId: job?.getId(),
		user: job?.getPublicUser(),
		message: err.message,
		stack: err.stack,
		meta: job?.getMeta()
	}

	if (statusCode >= 500) {
		logger.error(logData)
	} else {
		logger.warn(logData)
	}

	// Update Job status
	job?.markFailed(errorId, err)

	res.status(statusCode).json({
		status: 'error',
		code: statusCode,
		name: errorName,
		message,
		errorId,
		...(errors?.length && { errors }),
		...(config.get('env') !== 'production' && stack && { stack })
	})
}
