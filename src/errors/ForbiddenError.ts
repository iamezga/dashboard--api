import { HttpStatusCode } from './httpStatusCode'

/**
 * @class ForbiddenError
 * @extends Error
 * @description Represents an authorization error when a user is authenticated but
 * lacks the required permissions to perform the requested action.
 *
 * HTTP Status Code: 403 (Forbidden)
 *
 * Use cases:
 * - User lacks required permission for a use case
 * - Permission validation fails in permissionMiddleware
 * - Attempting to access resources from another organization (multi-tenancy violation)
 * - Role-based access control (RBAC) denials
 * - Action not allowed due to business rules (e.g., user is inactive)
 *
 * @example
 * ```typescript
 * if (!user.hasPermission('user.delete')) {
 *   throw new ForbiddenError('You do not have permission to delete users')
 * }
 * ```
 */
export class ForbiddenError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean

	/**
	 * Creates a new ForbiddenError instance.
	 *
	 * @param {string} message - Description of why access was denied
	 */
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.FORBIDDEN
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, ForbiddenError.prototype)
	}
}
