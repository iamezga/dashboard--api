import { getContainer } from '@/core/dependencyContainer'
import { UnauthorizedError } from '@/errors'
import { DecodedUserToken } from '@/modules/auth/entities/AuthDataTypes'
import { SessionRepositoryInterface } from '@/modules/session'
import { SessionData, SessionUser } from '@/modules/session/entities/Session'
import { UserRepositoryInterface } from '@/modules/user'
import { AuthenticatedUser, UserStatus } from '@/modules/user/entities/User'
import { NextFunction, Request, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

/**
 * @function authMiddleware
 * @description Middleware for user authentication. It validates a JWT from the request,
 * verifies the associated session in Redis, checks session/user validity,
 * and populates the Job with the authenticated user data.
 * @param {Request} req
 * @param {Response} res
 * @param {NextFunction} next
 */
export const authMiddleware = async (
	req: Request,
	res: Response,
	next: NextFunction
): Promise<void> => {
	try {
		const { job } = res.locals

		if (!req.requestData || !job) {
			throw new Error(
				'`requestDataMiddleware` and `jobMiddleware` must run before `authMiddleware`'
			)
		}

		let token: string | undefined = req.requestData.token

		if (!token) {
			const authHeader = req.headers.authorization
			if (!authHeader || !authHeader.startsWith('Bearer ')) {
				throw new UnauthorizedError('Authentication failed.')
			}
			token = authHeader.split('Bearer ')[1]
		}

		const container = getContainer()
		const jwtSecret = container.config.get('jwt.secret')
		const sessionRepository: SessionRepositoryInterface =
			container.repositoryManager.get('session')
		const userRepository: UserRepositoryInterface =
			container.repositoryManager.get('user')

		const { userId, sessionId } = container.libs.jwt.verify(
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

		// Retrieve cached user session data (pre-filtered permissions from login)
		// This avoids expensive database queries on every request
		const sessionUser: SessionUser | null = await sessionRepository.getUserData(
			userId
		)
		if (!sessionUser) {
			await sessionRepository.deleteAllUserSessions(userId)
			throw new UnauthorizedError('Authentication failed.')
		}

		// Verify user is still active (lightweight query, only status fields)
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

		// Store sessionId in job metadata for use in logout and other use cases
		job.updateMeta({ sessionId })

		// Update the 'lastActivity' in Redis to refresh the TTL
		await sessionRepository.updateLastActivity(
			sessionId,
			sessionMetadata.maxSessionTime
		)

		next()
	} catch (error: any) {
		if (
			error instanceof TokenExpiredError ||
			error instanceof JsonWebTokenError
		) {
			return next(new UnauthorizedError(`Authentication failed.`))
		}
		if (error instanceof UnauthorizedError) {
			return next(error)
		}
		return next(error)
	}
}
