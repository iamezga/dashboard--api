import { ValidationError } from 'fastest-validator'
import { HttpStatusCode } from './httpStatusCode'

export class BadRequestError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean
	public readonly errors?: ValidationError[]

	constructor(message: string = 'Bad request', errors: ValidationError[]) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.BAD_REQUEST
		this.isOperational = true
		this.errors = errors
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, BadRequestError.prototype)
	}
}
