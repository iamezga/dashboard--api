import { AppError } from './AppError'
import { HttpStatusCode } from './httpStatusCode'

export class NotFoundError extends AppError {
	constructor(message: string) {
		super(message, HttpStatusCode.NOT_FOUND)
	}
}
