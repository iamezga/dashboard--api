import { ValidationSchema } from 'fastest-validator'

export interface UseCaseRules {
	data?: ValidationSchema
	user?: ValidationSchema
	recaptchaResponse?: ValidationSchema
	attempts?: ValidationSchema
}
