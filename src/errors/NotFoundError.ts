import { HttpStatusCode } from './httpStatusCode'

/**
 * @class NotFoundError
 * @extends Error
 * @description Represents an error when a requested resource cannot be found.
 * This error is thrown when attempting to access or operate on a resource
 * that does not exist in the system.
 *
 * HTTP Status Code: 404 (Not Found)
 *
 * Use cases:
 * - User not found by ID or email
 * - Role, Permission, or Organization not found
 * - Session not found or expired
 * - Audit record not found
 * - Any entity lookup that returns null/undefined
 *
 * @example
 * ```typescript
 * const user = await repository.findById(userId)
 * if (!user) {
 *   throw new NotFoundError(`User with ID '${userId}' not found`)
 * }
 * ```
 */
export class NotFoundError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean

	/**
	 * Creates a new NotFoundError instance.
	 *
	 * @param {string} message - Description of what resource was not found
	 */
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.NOT_FOUND
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, NotFoundError.prototype)
	}
}
