import { TooManyRequestsError } from '@/errors'
import { databaseManager } from '@/infrastructure/databaseManager'
import { Job } from '@/lib/Job'
import { NextFunction, Request, Response } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'

/**
 * Creates a rate limiter middleware. It uses the user's ID or IP address as the key.
 * @param {number} points - Number of points a client can consume per duration.
 * @param {number} duration - Duration in seconds for the rate limit window.
 * @param {number} [blockDuration=0] - Duration in seconds to block the client if the limit is exceeded.
 * @returns {RequestHandler} - Express middleware.
 */
export const rateLimiterMiddleware = (
	points: number,
	duration: number,
	blockDuration: number = 0
) => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		const rateLimiter = new RateLimiterRedis({
			storeClient: databaseManager.get('redis'),
			points, // Number of points
			duration, // Per duration in seconds
			blockDuration, // custom block duration in seconds
			keyPrefix: 'rate_limit',
			useRedisPackage: true
		})
		try {
			const job = res.locals.job as Job

			if (!job) {
				throw new Error(
					'ValidationMiddleware: `jobMiddleware` must be run before `validationMiddleware`.'
				)
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
