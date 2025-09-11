import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/services/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { UserGetJobInterface } from './UserGetJobInterface'

/**
 * UseCase Example to define the standard structure that each new useCase of use must follo
 */
export class UserGetUseCase extends UseCase<UserGetJobInterface> {
	static readonly permission: string = 'user.get'
	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `user.get` permission check.
	 * It dynamically generates the schema based on the permission config,
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		const permissions = job.getUser().permissions

		const data = {
			permission: UserGetUseCase.permission
		}
		const schema = {
			permission: {
				type: 'enum',
				values: Object.keys(permissions)
			}
		}

		return { schema, data }
	}

	async run(job: UserGetJobInterface): Promise<UseCaseResponseInterface> {
		// ...Some business logic
		const data = job.getData()
		job.logger.info(data)
		const user = await this.container.repositories.user.findById(data.id)

		return {
			data: user || {},
			metadata: {
				attempts: job.getAttempts()
			}
		}
	}
}
