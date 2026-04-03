import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseInterface } from '@/types/useCase/UseCaseInterface'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'

/**
 * Abstract base class for all use cases.
 *
 * This class provides a contract and a minimal skeleton for specific use cases.
 * Its main responsibility is to define the `run` method, which encapsulates the
 * business logic for a specific action.
 *
 * Use cases that inherit from this class should focus exclusively on business logic,
 * assuming that all data has already been validated and prepared by the middleware
 * chain prior to accessing the use case.
 *
 * The class can interact with multiple external services. To simplify and standardize the
 * constructor for all use cases, a dependency container (`dependencyContainer`) for services
 * and dependencies was defined.
 */
export abstract class UseCase<
	J extends JobInterface = JobInterface
> implements UseCaseInterface<J> {
	static readonly permission?: string
	constructor(protected container: DependencyContainer) {}

	/**
	 * Builds the permission validation schema and data for a given permission key.
	 * Used by `getPermissionValidationData` in each use case to populate the
	 * validator with the current user's active membership permissions.
	 * @param {string} permissionKey - The permission key required by the use case (e.g. 'user.create').
	 * @param {JobInterface} job - The current job containing the authenticated user context.
	 * @returns {{ schema: Record<string, any>, data: Record<string, any> }}
	 */
	static buildPermissionSchema(
		permissionKey: string,
		job: JobInterface
	): { schema: Record<string, any>; data: Record<string, any> } {
		const schema: Record<string, any> = {
			permission: {
				type: 'enum',
				values: Object.keys(job.getUser().membership?.permissions || {})
			}
		}
		const data: Record<string, any> = { permission: permissionKey }
		return { schema, data }
	}

	/**
	 * The `run` method is the entry point for executing the use case's business logic.
	 *
	 * @param job The Job object containing all the necessary data and context for the request.
	 * @returns A promise that resolves to an object containing the use case's response data.
	 */
	public abstract run(job: J): Promise<UseCaseResponseInterface>
}
