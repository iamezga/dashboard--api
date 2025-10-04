import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from './UseCasePermissionValidationData'
import { UseCaseResponseInterface } from './UseCaseResponseInterface'

export interface UseCaseInterface<J extends JobInterface = JobInterface> {
	readonly permission?: string
	/**
	 * The static permission method. This method translates the raw permission configuration
	 * into a validation schema and the data needed for validation.
	 * @param config The raw permission configuration.
	 * @param job The Job object containing all request data.
	 */
	getPermissionValidationData?(
		job: JobInterface,
		container: DependencyContainer
	): Promise<UseCasePermissionValidationData>
	run: (job: J) => Promise<UseCaseResponseInterface>
}
