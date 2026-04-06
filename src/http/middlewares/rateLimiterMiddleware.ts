import { TooManyRequestsError } from '@/errors'
import { databaseManager } from '@/infrastructure/databaseManager'
import logger from '@/services/logger'
import { NextFunction, Request, Response } from 'express'
import { RateLimiterRedis } from 'rate-limiter-flexible'

/**
 * Rate limiter configuration interface.
 */
export interface RateLimiterConfig {
	/** Number of allowed requests per duration window */
	points: number
	/** Duration of the rate limit window in seconds */
	duration: number
	/** Duration in seconds to block the client if limit is exceeded (0 = no block) */
	blockDuration?: number
}

/**
 * Centralized rate limiter configurations for different endpoints.
 *
 * @description
 * Defines standard rate limiting policies used across the API:
 * - `strict`: For sensitive operations (login, password reset) - 3 requests/min, 5min block
 * - `moderate`: For user operations - 10 requests/min, 1min block
 * - `permissive`: For read operations - 30 requests/min, no block
 *
 * @example
 * ```typescript
 * // Apply strict rate limiting to login endpoint
 * router.post('/login',
 *   rateLimiterMiddleware(RATE_LIMITS.strict.points, RATE_LIMITS.strict.duration, RATE_LIMITS.strict.blockDuration),
 *   loginHandler
 * )
 * ```
 */
export const RATE_LIMITS: Record<string, RateLimiterConfig> = {
	/** Strict limits for authentication endpoints (login, password reset) */
	strict: {
		points: 3,
		duration: 60,
		blockDuration: 300
	},
	/** Moderate limits for user operations (create, update) */
	moderate: {
		points: 10,
		duration: 60,
		blockDuration: 60
	},
	/** Permissive limits for read operations */
	permissive: {
		points: 30,
		duration: 60,
		blockDuration: 0
	}
}

/**
 * Creates a rate limiter middleware using Redis as the backing store.
 *
 * @description
 * This middleware protects endpoints from abuse by limiting the number of requests
 * a client can make within a specific time window. It uses Redis for distributed
 * rate limiting across multiple server instances.
 *
 * The middleware identifies clients by:
 * - User ID (if authenticated)
 * - IP address (if not authenticated)
 *
 * When the rate limit is exceeded:
 * 1. Sets the `Retry-After` header indicating when the client can retry
 * 2. Logs the rate limit violation with client identifier
 * 3. Returns a 429 Too Many Requests error
 *
 * @param {number} points - Number of requests allowed per duration window
 * @param {number} duration - Duration of the rate limit window in seconds
 * @param {number} [blockDuration=0] - Duration in seconds to block the client if limit is exceeded (0 = no block)
 *
 * @returns {Function} Express middleware function
 *
 * @example
 * ```typescript
 * // Strict rate limiting: 3 requests per minute with 5-minute block
 * router.post('/login',
 *   rateLimiterMiddleware(3, 60, 300),
 *   loginHandler
 * )
 *
 * // Using centralized config
 * router.post('/reset-password',
 *   rateLimiterMiddleware(
 *     RATE_LIMITS.strict.points,
 *     RATE_LIMITS.strict.duration,
 *     RATE_LIMITS.strict.blockDuration
 *   ),
 *   resetPasswordHandler
 * )
 * ```
 *
 * @throws {Error} If jobMiddleware hasn't been run before this middleware
 * @throws {TooManyRequestsError} When the rate limit is exceeded
 *
 * @see {@link https://github.com/animir/node-rate-limiter-flexible rate-limiter-flexible documentation}
 */
export const rateLimiterMiddleware = (
	points: number,
	duration: number,
	blockDuration: number = 0
) => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		// Validate job exists before proceeding
		const { job } = res.locals

		if (!job) {
			throw new Error(
				'RateLimiterMiddleware: `jobMiddleware` must be run before `rateLimiterMiddleware`.'
			)
		}

		const rateLimiter = new RateLimiterRedis({
			storeClient: databaseManager.get('redis'),
			points,
			duration,
			blockDuration,
			keyPrefix: 'rate_limit',
			useRedisPackage: true
		})

		try {
			const jobMeta = job.getMeta()
			const user = job.getPublicUser()
			const identifier = user ? user.id : jobMeta.ip!

			await rateLimiter.consume(identifier, 1)
			next()
		} catch (error: any) {
			// Rate limit exceeded
			if (error.msBeforeNext) {
				const jobMeta = job.getMeta()
				const user = job.getPublicUser()
				const identifier = user ? user.id : jobMeta?.ip || 'unknown'
				const retryAfterSeconds = Math.ceil(error.msBeforeNext / 1000)

				job.updateMeta({
					rateLimitRetryAfterSeconds: retryAfterSeconds,
					rateLimitIdentifier: identifier,
					rateLimitPoints: points,
					rateLimitDurationSeconds: duration
				})

				logger.warn(
					`Rate limit exceeded for ${user ? 'user' : 'IP'}: ${identifier}. ` +
						`Retry after ${retryAfterSeconds}s (${points} requests per ${duration}s)`
				)

				res.set('Retry-After', retryAfterSeconds.toString())
			}

			return next(
				new TooManyRequestsError('Too many requests. Please try again later.')
			)
		}
	}
}
