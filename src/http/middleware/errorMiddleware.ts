import {
	BadRequestError,
	ForbiddenError,
	HttpStatusCode,
	NotFoundError,
	UnauthorizedError
} from '@/errors'
import config from '@/services/config'
import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import { ValidationError } from 'fastest-validator'

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
	let statusCode: HttpStatusCode = HttpStatusCode.INTERNAL_SERVER_ERROR
	let message: string = 'An unexpected error has occurred.'
	let errorName: string = 'Internal Server Error'
	let errors: ValidationError[] = []
	let stack: string | undefined = undefined

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
		// Non-operational error
		errorName = 'InternalServerError'
		if (process.env.NODE_ENV !== 'production') {
			message = err.message || 'An unexpected error has occurred.'
			stack = err.stack
			console.log(err.stack)
		}
		if (config.get('sentry.dsn')) {
			Sentry.captureException(err)
		}
	}

	res.status(statusCode).json({
		status: 'error',
		code: statusCode,
		name: errorName,
		message,
		...(errors?.length && { errors }),
		...(stack && { stack })
	})
}
