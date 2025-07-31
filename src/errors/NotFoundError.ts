import { HttpStatusCode } from './httpStatusCode'

export class NotFoundError extends Error {
	public readonly statusCode: number
	public readonly isOperational: boolean
	constructor(message: string) {
		super(message)
		this.name = this.constructor.name
		this.statusCode = HttpStatusCode.NOT_FOUND
		this.isOperational = true
		Error.captureStackTrace(this, this.constructor)
		Object.setPrototypeOf(this, NotFoundError.prototype)
	}
}
