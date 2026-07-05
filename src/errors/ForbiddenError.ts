import { AppError } from './AppError'
import { HttpStatusCode } from './httpStatusCode'

export class ForbiddenError extends AppError {
	constructor(message: string) {
		super(message, HttpStatusCode.FORBIDDEN)
	}
}
