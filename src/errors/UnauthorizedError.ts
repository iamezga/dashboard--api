import { AppError } from './AppError'
import { HttpStatusCode } from './httpStatusCode'

export class UnauthorizedError extends AppError {
	constructor(message: string) {
		super(message, HttpStatusCode.UNAUTHORIZED)
	}
}
