import { getContainer } from '@/core/dependencyContainer'
import { UnauthorizedError } from '@/errors'
import { useCases } from '@/modules'
import { validator } from '@/services/validationService'
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
			const { job } = res.locals
			const useCaseClass = useCases[useCaseName]

			if (!job) {
				throw new Error(
					`Permission Middleware Error: Job object not found for use case ${useCaseName}`
				)
			}

			if (!useCaseClass) {
				throw new Error(
					`Permission Middleware Error: Use Case "${useCaseName}" not found.`
				)
			}

			// Verify that permissionMiddleware is not applied to a public use case
			// (public use cases should not have the `permission` property)
			if (!(useCaseClass as any).permission) {
				throw new Error(
					`Permission Middleware Error: Use Case "${useCaseName}" is public (has no permission property). Remove permissionMiddleware from this route, or add a permission property to the use case.`
				)
			}

			// At this point, getPermissionValidationData must exist (validated at startup by useCaseValidator)
			// This check is defensive programming for runtime safety
			if (
				typeof (useCaseClass as any).getPermissionValidationData !== 'function'
			) {
				throw new Error(
					`Permission Middleware Error: Use Case "${useCaseName}" has permission="${
						(useCaseClass as any).permission
					}" but is missing getPermissionValidationData() method. This should have been caught at startup.`
				)
			}

			// Get the validation schema and data from the use case's method.
			const { schema, data } = await (
				useCaseClass as any
			).getPermissionValidationData(job, getContainer())

			// The `Schema` and` Data` contain at least the information necessary to validate if the user has the necessary permission
			// It can also include validation for specific conditions of each use case
			// extend validator meta
			const errors = await validator.validate(data, schema, {
				job,
				container: getContainer()
			})
			if (errors.length > 0) {
				throw new UnauthorizedError(
					`Authorization failed: you don't have permissions for this action.`
				)
			}

			return next()
		} catch (error: any) {
			next(error)
		}
	}
}
