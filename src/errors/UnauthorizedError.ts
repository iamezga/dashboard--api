import { HttpStatusCode } from './httpStatusCode'

export class UnauthorizedError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.UNAUTHORIZED
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
	}
}
