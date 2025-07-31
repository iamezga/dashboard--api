import { HttpStatusCode } from './httpStatusCode'

export class ForbiddenError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.FORBIDDEN
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, ForbiddenError.prototype)
	}
}
