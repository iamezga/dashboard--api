import { HttpStatusCode } from './httpStatusCode'

export class TooManyRequestsError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.TOO_MANY_REQUESTS
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, TooManyRequestsError.prototype)
	}
}
