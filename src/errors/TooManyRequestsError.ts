import { HttpStatusCode } from './httpStatusCode'

/**
 * @class TooManyRequestsError
 * @extends Error
 * @description Represents an error when a client exceeds the allowed rate limit
 * for API requests.
 *
 * HTTP Status Code: 429 (Too Many Requests)
 *
 * Use cases:
 * - Rate limiting exceeded for login attempts
 * - Too many password recovery requests
 * - API quota exceeded
 * - Brute force attack prevention
 * - DDoS protection
 *
 * @example
 * ```typescript
 * const attempts = await rateLimiter.consume(ip)
 * if (attempts > maxAttempts) {
 *   throw new TooManyRequestsError('Too many login attempts. Please try again later.')
 * }
 * ```
 */
export class TooManyRequestsError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean

	/**
	 * Creates a new TooManyRequestsError instance.
	 *
	 * @param {string} message - Description of the rate limit violation
	 */
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.TOO_MANY_REQUESTS
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, TooManyRequestsError.prototype)
	}
}
