import { useCases } from '@/modules'

/**
 * Validates that all use cases with a declared `permission` property
 * also implement the required `getPermissionValidationData` static method.
 *
 * Use cases without a `permission` property are considered public and are skipped.
 * Public use cases (e.g., password recovery, public endpoints) should NOT declare a permission.
 *
 * This validation runs at application startup to catch configuration errors early.
 *
 * @throws {Error} If a use case has a `permission` but is missing `getPermissionValidationData`.
 */
export function validateUseCases(): void {
	const errors: string[] = []

	Object.entries(useCases).forEach(([name, UseCaseClass]) => {
		const permission = (UseCaseClass as any).permission

		// Skip public use cases (those without a permission property)
		if (!permission) {
			return
		}

		// If a use case has a permission, it MUST implement getPermissionValidationData
		if (
			typeof (UseCaseClass as any).getPermissionValidationData !== 'function'
		) {
			errors.push(
				`UseCase "${name}" declares permission="${permission}" but is missing the static method "getPermissionValidationData()"`
			)
		}
	})

	if (errors.length > 0) {
		throw new Error(
			`Use case validation failed:\n${errors.map(e => `  - ${e}`).join('\n')}`
		)
	}
}
