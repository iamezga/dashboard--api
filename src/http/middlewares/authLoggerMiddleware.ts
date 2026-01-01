import { UnauthorizedError } from '@/errors'
import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'

/**
 * Middleware that enriches the job's logger with authenticated user details.
 * It's executed after `authMiddleware` to ensure user data is available.
 */
export const authLoggerMiddleware = (
	_req: Request,
	res: Response,
	next: NextFunction
) => {
	try {
		const { job } = res.locals
		if (!job) {
			throw new UnauthorizedError('Authentication failed: missing job object.')
		}

		const user = job.getUser()
		if (!user) {
			// User data is not set, which means authentication failed.
			// `authMiddleware` should have handled this, but we'll double check.
			throw new UnauthorizedError('Authentication failed: user data missing.')
		}

		// Create a new child logger with user-specific context.
		// This extends the previous logger with new properties.
		const jobLoggerWithAuth = (job.logger as Logger).child({
			userId: user.id,
			organizationId: user.organizationId,
			userRole: user.roleId
		})

		// Replace the job's logger with the new, richer logger.
		// Now, all subsequent log calls will include these new details.
		job.logger = jobLoggerWithAuth

		next()
	} catch (error: any) {
		next(error)
	}
}
