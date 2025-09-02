import { UnauthorizedError } from '@/errors'
import { useCases } from '@/modules'
import logger from '@/services/logger'
import { validator } from '@/services/validationService'
import { JobInterface } from '@/types/job/JobInterface'
import { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * @description
 * Middleware that dynamically validates user permissions for a use case.
 * It ensures that the user has the necessary permissions and that the use case
 * is correctly configured to handle permission validation.
 *
 * @param {keyof typeof useCases} useCaseName - The name of the use case to validate permissions for.
 * @returns {Function} An Express middleware function.
 */
export const permissionMiddleware = (
	useCaseName: keyof typeof useCases
): RequestHandler => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const job = res.locals.job as JobInterface
			const useCaseClass = useCases[useCaseName]

			if (!job) {
				logger.error(
					`Permission Middleware Error: Job object not found for use case ${useCaseName}`
				)
				throw new UnauthorizedError(`Authorization failed.`)
			}

			if (!useCaseClass) {
				logger.error(
					`Permission Middleware Error: Use Case "${useCaseName}" not found.`
				)
				throw new UnauthorizedError(`Authorization failed.`)
			}
			// The `permission` property and `getPermissionValidationData` method are mandatory for private use case
			if (
				!(useCaseClass as any).permission ||
				typeof (useCaseClass as any).getPermissionValidationData !== 'function'
			) {
				logger.error(
					`Permission Middleware Error: Use Case "${useCaseName}" is missing permission configuration.`
				)
				throw new UnauthorizedError(`Authorization failed.`)
			}

			// Get the validation schema and data from the use case's method.
			const { schema, data } = (
				useCaseClass as any
			).getPermissionValidationData(job)

			// The `Schema` and` Data` contain at least the information necessary to validate if the user has the necessary permission
			// It can also include validation for specific conditions of each case of use
			const errors = await validator.validate(data, schema, {})
			if (errors.length > 0) {
				throw new UnauthorizedError(
					`Authorization failed: you don't have permissions for this action.`
				)
			}

			return next()
		} catch (error) {
			next(error)
		}
	}
}
