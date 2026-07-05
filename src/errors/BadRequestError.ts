import { ValidationError } from 'fastest-validator'
import { AppError } from './AppError'
import { HttpStatusCode } from './httpStatusCode'

export class BadRequestError extends AppError {
	constructor(message: string, errors?: ValidationError[]) {
		super(message, HttpStatusCode.BAD_REQUEST, errors)
	}
}
