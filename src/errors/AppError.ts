import { ValidationError } from 'fastest-validator'
import { HttpStatusCode } from './httpStatusCode'

export class AppError extends Error {
	public readonly statusCode: HttpStatusCode
	public readonly isOperational: boolean
	public readonly errors?: ValidationError[]

	constructor(
		message: string,
		statusCode: HttpStatusCode,
		errors?: ValidationError[]
	) {
		super(message)
		this.name = new.target.name
		this.statusCode = statusCode
		this.isOperational = true
		this.errors = errors
		Error.captureStackTrace(this, new.target)
		Object.setPrototypeOf(this, new.target.prototype)
	}
}
