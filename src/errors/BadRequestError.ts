import { ValidationError } from 'fastest-validator'
import { HttpStatusCode } from './httpStatusCode'

/**
 * @class BadRequestError
 * @extends Error
 * @description Represents a client error due to invalid input or malformed request data.
 * This error is thrown when request validation fails or when the client provides
 * invalid data that cannot be processed.
 *
 * HTTP Status Code: 400 (Bad Request)
 *
 * Use cases:
 * - Validation errors (missing required fields, invalid formats)
 * - Malformed request body
 * - Invalid parameter values
 * - Business rule violations at the input level
 *
 * @example
 * ```typescript
 * const errors = [{ field: 'email', message: 'Invalid email format' }]
 * throw new BadRequestError('Validation failed', errors)
 * ```
 */
export class BadRequestError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean
	public readonly errors?: ValidationError[]

	/**
	 * Creates a new BadRequestError instance.
	 *
	 * @param {string} message - Human-readable error message
	 * @param {ValidationError[]} errors - Array of validation errors with details
	 */
	constructor(message: string, errors: ValidationError[]) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.BAD_REQUEST
		this.isOperational = true
		this.errors = errors
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, BadRequestError.prototype)
	}
}
