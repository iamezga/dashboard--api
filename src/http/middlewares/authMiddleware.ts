import { UnauthorizedError } from '@/errors'
import { Job } from '@/lib/Job'
import { DecodedUserToken } from '@/modules/auth/entities/AuthDataTypes'
import { SessionRepositoryInterface } from '@/modules/session'
import { SessionData, SessionUser } from '@/modules/session/entities/Session'
import { UserRepositoryInterface } from '@/modules/user'
import { AuthenticatedUser, UserStatus } from '@/modules/user/entities/User'
import { DependencyContainer } from '@/services/dependencyContainer'
import { NextFunction, Request, RequestHandler, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

/**
 * @function authMiddleware
 * @description Factory function that creates and returns an Express middleware for user authentication.
 * It validates a JWT, verifies the associated session in Redis, and populates the Job with user data and permissions.
 * @param {DependencyContainer} container - The application's dependency container.
 * @returns {RequestHandler} An Express middleware function.
 */
export const authMiddleware = (
	container: DependencyContainer
): RequestHandler => {
	const { jwt } = container.thirdParties
	const { config, repositories } = container
	const jwtSecret = config.get('jwt.secret')
	const jwtExpiresIn = config.get('jwt.expiresIn')

	if (!jwtSecret || !jwtExpiresIn) {
		throw new Error('JWT configuration is missing in the environment.')
	}

	return async (
		req: Request,
		res: Response,
		next: NextFunction
	): Promise<void> => {
		if (!req.requestData || !res.locals.job) {
			throw new Error(
				'`requestDataMiddleware` and `jobMiddleware` must run before `authMiddleware`'
			)
		}

		const job = res.locals.job as Job
		let token: string | undefined = req.requestData.token

		if (!token) {
			const authHeader = req.headers.authorization
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new UnauthorizedError('Authentication failed.')
			}
			token = authHeader.split('Bearer ')[1]
		}

		try {
			const sessionRepository: SessionRepositoryInterface = repositories.session
			const userRepository: UserRepositoryInterface = repositories.user

			const { userId, sessionId } = jwt.verify(
				token,
				jwtSecret
			) as DecodedUserToken

			// Retrieve session metadata from Redis
			const sessionMetadata: SessionData | null =
				await sessionRepository.getSessionMetadata(sessionId)

			if (!sessionMetadata) {
				throw new UnauthorizedError('Authentication failed.')
			}

			const now = Date.now()
			// Convert Redis values from seconds to milliseconds for comparison
			const maxInactiveTimeInMs = sessionMetadata.maxInactiveTime * 1000
			const maxSessionTimeInMs = sessionMetadata.maxSessionTime * 1000

			const sessionIsInactive =
				now - sessionMetadata.lastActivity > maxInactiveTimeInMs
			const sessionIsExpired =
				now - sessionMetadata.sessionStartTime > maxSessionTimeInMs

			if (sessionIsInactive || sessionIsExpired) {
				// Delete the expired/inactive session from Redis
				await sessionRepository.deleteSession(sessionId)
				throw new UnauthorizedError('Authentication failed.')
			}

			const sessionUser: SessionUser | null =
				await sessionRepository.getUserData(userId)
			if (!sessionUser) {
				await sessionRepository.deleteAllUserSessions(userId)
				throw new UnauthorizedError('Authentication failed.')
			}

			const userStatus: UserStatus | null = await userRepository.findStatusById(
				userId
			)
			if (!userStatus || !userStatus.active || userStatus.deletedAt) {
				await sessionRepository.deleteAllUserSessions(userId)
				throw new UnauthorizedError('Authentication failed.')
			}

			const authenticatedUser: AuthenticatedUser = {
				...sessionUser,
				...userStatus
			}

			// Set authenticated user in the job
			job.setUser(authenticatedUser)

			// Update the 'lastActivity' in Redis to refresh the TTL
			await sessionRepository.updateLastActivity(
				sessionId,
				sessionMetadata.maxSessionTime
			)

			next()
		} catch (error: any) {
			if (error instanceof TokenExpiredError) {
				return next(new UnauthorizedError(`Authentication failed.`))
			}
			if (error instanceof JsonWebTokenError || error instanceof SyntaxError) {
				return next(new UnauthorizedError('Authentication failed.'))
			}

			return next(error)
		}
	}
}
