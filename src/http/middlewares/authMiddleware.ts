import { UnauthorizedError } from '@/errors'
import { Job } from '@/lib/Job'
import { DecodedUserToken } from '@/modules/auth/entities/AuthDataTypes'
import { SessionData } from '@/modules/session/entities/Session'
import { AuthenticatedUser } from '@/modules/user/entities/User'
import { DependencyContainer } from '@/services/dependencyContainer'
import { NextFunction, Request, RequestHandler, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

/**
 * @function authMiddleware
 * @description Factory function that creates and returns an Express middleware for user authentication via JWT and session validation.
 * It extracts the JWT, verifies it, retrieves the session data from Redis,
 * and attaches the session information and the User object to the Job context.
 * @param {DependencyContainer} container - The application's dependency container.
 * @returns {RequestHandler} An Express middleware function.
 */
export const authMiddleware = (
	container: DependencyContainer
): RequestHandler => {
	const { jwt, ms: msConverter } = container.thirdParties
	const { config, repositories } = container

	const jwtSecret = config.get('jwt.secret')
	const jwtExpiresIn = config.get('jwt.expiresIn')

	if (!jwtSecret) {
		throw new Error('JWT_SECRET is not defined in the configuration.')
	}

	if (!jwtExpiresIn) {
		throw new Error('JWT_EXPIRES_IN is not defined in the configuration.')
	}

	return async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		if (!req.requestData) {
			return next(
				new Error(
					'`requestDataMiddleware` must be run before `authMiddleware`.'
				)
			)
		}

		let token: string | undefined = req.requestData.token

		if (!token) {
			const authHeader = req.headers.authorization
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new UnauthorizedError(
					'No authentication token provided or token malformed.'
				)
			}
			token = authHeader.split('Bearer ')[1]
		}

		const job = res.locals.job as Job
		if (!job) {
			throw new Error('`jobMiddleware` must be run before `authMiddleware`.')
		}

		try {
			const decodedPayload = jwt.verify(token, jwtSecret) as DecodedUserToken

			const session: SessionData | null = await repositories.session.findById(
				decodedPayload.userId
			)

			if (!session) {
				// Session not found in Redis, token is invalid or session has expired/been deleted
				throw new UnauthorizedError('Authentication failed: Session not found.')
			}

			const now = Date.now()
			const maxInactiveTime = msConverter(session.maxInactiveTime) // ms returns milliseconds
			const maxSessionTime = msConverter(session.maxSessionTime) // ms returns milliseconds
			const sessionIsInactive =
				now - session.lastActivity > Number(maxInactiveTime)
			const sessionIsExpired =
				now - session.sessionStartTime > Number(maxSessionTime)

			if (sessionIsInactive || sessionIsExpired) {
				// Delete the expired/inactive session from Redis
				await repositories.session.delete(decodedPayload.userId)
				throw new UnauthorizedError(
					'Authentication failed: Session expired due to inactivity.'
				)
			}

			// Lightweight DB check for critical, volatile data (e.g., active status)
			const userStatus = await repositories.user.findStatusById(
				decodedPayload.userId
			)
			// If user doesn't exist in DB or is inactive, invalidate the session
			if (!userStatus || !userStatus.active || userStatus.deletedAt) {
				await repositories.session.delete(decodedPayload.userId) // Clean up stale session
				throw new UnauthorizedError(
					'Authentication failed: User is inactive or not found.'
				)
			}

			// Construct the AuthenticatedUser object from session data and the live status check
			const authenticatedUser: AuthenticatedUser = {
				...session.user,
				active: userStatus.active, //userStatus.active,
				permissions: session.permissions,
				// Fill in other User properties not stored in session with default/null values
				// as they are generally not needed for authorization logic in subsequent use cases.
				lastLogin: null,
				config: userStatus.config,
				createdAt: userStatus.createdAt,
				updatedAt: userStatus.updatedAt,
				deletedAt: null
			}

			// Set authenticated user in the job
			job.setUser(authenticatedUser)

			// Update the 'lastActivity' in Redis to refresh the TTL
			await repositories.session.updateLastActivity(
				decodedPayload.userId,
				session.maxSessionTime
			)

			next()
		} catch (error: any) {
			if (error instanceof TokenExpiredError) {
				next(
					new UnauthorizedError(
						`Authentication failed: Token expired at ${error.expiredAt}.`
					)
				)
			} else if (
				error instanceof JsonWebTokenError ||
				error instanceof SyntaxError
			) {
				next(
					new UnauthorizedError(
						'Authentication failed: Incorrect token signature or format.'
					)
				)
			} else if (error instanceof UnauthorizedError) {
				next(error)
			} else {
				container.logger.error(
					`AuthMiddleware unexpected error: ${
						error instanceof Error ? error.message : String(error)
					}`
				)
				next(
					new UnauthorizedError(
						'Authentication failed due to an unexpected error.'
					)
				)
			}
		}
	}
}
