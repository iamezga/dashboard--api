import { TooManyRequestsError } from '@/errors'
import { DependencyContainer } from '@/services/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { NextFunction, Request, Response } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'

/**
 * Creates a rate limiter middleware.
 * @param {DependencyContainer} container - App's dependency container.
 * @param {number} points - Number of points a client can consume.
 * @param {number} duration - Duration in seconds.
 * @returns {RequestHandler} - Express middleware.
 */
export const rateLimiterMiddleware = (
	container: DependencyContainer,
	points: number,
	duration: number,
	blockDuration: number = 0
) => {
	const rateLimiter = new RateLimiterRedis({
		storeClient: container.databaseClients.redis,
		points, // Number of points
		duration, // Per duration in seconds
		blockDuration, // custom block duration in seconds
		keyPrefix: 'rate_limit',
		useRedisPackage: true
	})

	return async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const job = res.locals.job as JobInterface

			if (!job) {
				container.logger.error(
					'ValidationMiddleware: `jobMiddleware` must be run before `validationMiddleware`.'
				)

				throw new Error('An unexpected error has occurred.')
			}
			const jobMeta = job.getMeta()
			const user = job.getPublicUser()
			await rateLimiter.consume(user ? user.id : jobMeta.ip!, 1)
			next()
		} catch (error: any) {
			if (error.msBeforeNext) {
				res.set('Retry-After', Math.ceil(error.msBeforeNext / 1000).toString())
			}
			return next(
				new TooManyRequestsError('Too many requests. Please try again later.')
			)
		}
	}
}
