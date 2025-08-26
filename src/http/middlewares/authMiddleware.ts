import { NextFunction, Request, RequestHandler, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'

import { UnauthorizedError } from '@/errors'
import { Job } from '@/lib/Job'
import { DecodedUserToken } from '@/modules/auth/entities/AuthDataTypes'
import { DependencyContainer } from '@/services/dependencyContainer'

/**
 * @function authMiddleware
 * @description Factory function that creates and returns an Express middleware for user authentication via JWT.
 * It extracts the token (from requestData or Authorization header), verifies it,
 * fetches the full user entity from the database, and attaches it to the Job context.
 * @param {DependencyContainer} container - The application's dependency container.
 * @returns {RequestHandler} An Express middleware function.
 */
export const authMiddleware = (
	container: DependencyContainer
): RequestHandler => {
	const jwt = container.thirdParties.jwt
	const config = container.config
	const userRepository = container.repositories.user

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

			const user = await userRepository.findById(decodedPayload.userId)

			if (!user || !user.active || user.deletedAt) {
				throw new UnauthorizedError('Authentication failed: Incorrect token.')
			}

			job.setUser(user)
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
