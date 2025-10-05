import {
	BadRequestError,
	ForbiddenError,
	HttpStatusCode,
	NotFoundError,
	UnauthorizedError
} from '@/errors'
import { TooManyRequestsError } from '@/errors/TooManyRequestsError'
import { config } from '@/services/config'
import logger from '@/services/logger'
import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'fastest-validator'
import { randomUUID } from 'node:crypto'
import { Logger } from 'pino'

type HandledError =
	| BadRequestError
	| ForbiddenError
	| NotFoundError
	| UnauthorizedError
	| TooManyRequestsError
	| Error

/**
 * @function errorMiddleware
 * @description A global Express error handling middleware. It intercepts all errors thrown
 * in the application, standardizes the response format, logs the error, and reports
 * to external services like Sentry.
 *
 * Responsibilities:
 * - Differentiates between operational errors (e.g., BadRequestError) and unexpected programming errors.
 * - Generates a unique `errorId` for traceability.
 * - Logs operational errors as warnings and programming errors as errors, using the job-specific logger if available.
 * - Sends a consistent JSON error response to the client. The level of detail (e.g., stack trace) depends on the environment.
 * - Reports 500-level errors to Sentry (if configured).
 * - Marks the associated `Job` as failed.
 *
 * @param {HandledError} err - The error object. Can be a custom HTTP error or a generic Error.
 * @param {Request} _req - The Express request object (unused).
 * @param {Response} res - The Express response object.
 * @param {NextFunction} _next - The Express next function (unused).
 */
export const errorMiddleware = async (
	err: HandledError,
	_req: Request,
	res: Response,
	_next: NextFunction
) => {
	const { job } = res.locals
	const errorId = randomUUID()

	let statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR
	let message = 'An unexpected error has occurred.'
	let errorName = 'Internal Server Error'
	let errors: ValidationError[] = []
	let stack: string | undefined
	if (
		err instanceof BadRequestError ||
		err instanceof ForbiddenError ||
		err instanceof NotFoundError ||
		err instanceof UnauthorizedError ||
		err instanceof TooManyRequestsError
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

	const logInstance: Logger = job?.logger || logger

	const logData = {
		errorId,
		jobId: job?.getId(),
		user: job?.getPublicUser(),
		message: err.message,
		stack: err.stack,
		meta: job?.getMeta()
	}

	if (statusCode >= 500) {
		logInstance.error(logData, err.message || message)
	} else {
		logInstance.warn(logData, message)
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
