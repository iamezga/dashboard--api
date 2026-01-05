import { HttpStatusCode } from './httpStatusCode'

/**
 * @class UnauthorizedError
 * @extends Error
 * @description Represents an authentication error when a user is not authenticated
 * or their credentials are invalid.
 *
 * HTTP Status Code: 401 (Unauthorized)
 *
 * Use cases:
 * - Missing or invalid JWT token
 * - Token expired or malformed
 * - Invalid login credentials (email/password mismatch)
 * - Session not found or expired
 * - User validation fails in authMiddleware
 * - Password recovery token invalid or expired
 *
 * @example
 * ```typescript
 * const user = await repository.findByEmail(email)
 * if (!user || !(await verifyPassword(password, user.password))) {
 *   throw new UnauthorizedError('Invalid email or password')
 * }
 * ```
 */
export class UnauthorizedError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean

	/**
	 * Creates a new UnauthorizedError instance.
	 *
	 * @param {string} message - Description of the authentication failure
	 */
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.UNAUTHORIZED
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, UnauthorizedError.prototype)
	}
}
