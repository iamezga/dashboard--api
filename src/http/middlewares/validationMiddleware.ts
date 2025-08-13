import { BadRequestError, UnauthorizedError } from '@/errors'
import { rules } from '@/modules'
import { validator } from '@/services/validationService'
import { JobInterface } from '@/types/job/JobInterface'
import { NextFunction, Request, Response } from 'express'

/**
 * Middleware responsible for validating the Job's data, user, and other properties.
 * It takes the name of the use case rule as an argument to fetch the correct rules.
 */
export const validationMiddleware = (useCaseRuleName: keyof typeof rules) => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const job = res.locals.job as JobInterface

			if (!job) {
				return next(
					new Error(
						'`jobMiddleware` must be run before `validationMiddleware`.'
					)
				)
			}

			// Get rules by use case rule name
			const useCaseRules = rules[useCaseRuleName]
			if (!useCaseRules) {
				return next(
					new Error(
						`Validation rules for use case "${useCaseRuleName}" not found.`
					)
				)
			}

			// Validate de job.user
			if (useCaseRules.user) {
				const userErrors = await validator.validate(
					job.getUser() || {},
					useCaseRules.user,
					job.getMeta()
				)
				if (userErrors.length) {
					throw new UnauthorizedError('User Validation failed.')
				}
			}

			// Validate job.attempts
			if (useCaseRules.attempts) {
				const attemptsErrors = await validator.validate(
					{ attempts: job.getAttempts() },
					useCaseRules.attempts,
					job.getMeta()
				)
				if (attemptsErrors.length) {
					throw new BadRequestError(
						'Attempts Validation failed.',
						attemptsErrors
					)
				}
			}

			// Validate job.data
			if (useCaseRules.data) {
				const dataErrors = await validator.validate(
					job.getData(),
					useCaseRules.data,
					job.getMeta()
				)
				if (dataErrors.length) {
					throw new BadRequestError('Data Validation failed.', dataErrors)
				}
			}

			// Validate job.recaptchaResponses
			if (useCaseRules.recaptchaResponse) {
				const recaptchaErrors = await validator.validate(
					{ recaptchaResponse: job.getRecaptchaResponse() || '' },
					useCaseRules.recaptchaResponse,
					job.getMeta()
				)
				if (recaptchaErrors.length) {
					throw new BadRequestError(
						'Recaptcha Validation failed.',
						recaptchaErrors
					)
				}
			}

			// everything ok
			return next()
		} catch (error) {
			next(error)
		}
	}
}
