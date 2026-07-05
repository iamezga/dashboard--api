import { AppError } from './AppError'
import { HttpStatusCode } from './httpStatusCode'

export class TooManyRequestsError extends AppError {
	constructor(message: string) {
		super(message, HttpStatusCode.TOO_MANY_REQUESTS)
	}
}
