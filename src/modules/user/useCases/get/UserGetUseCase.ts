import { NotFoundError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { User } from '../../entities/User'
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
		return this.buildPermissionSchema(this.permission, job)
	}

	public async run(
		job: UserGetJobInterface
	): Promise<UseCaseResponseInterface<User>> {
		const { id } = job.getData()
		const requestingUser = job.getUser()

		this.container.logger.info(
			{ userId: id, organizationId: requestingUser.organizationId },
			'Fetching user by ID'
		)

		const userRepository = this.container.repositoryManager.get('user')
		const user = await userRepository.findById(
			id,
			requestingUser.organizationId
		)

		if (!user) {
			throw new NotFoundError(`User with ID ${id} not found`)
		}

		this.container.logger.info(
			{ userId: user.id, email: user.email },
			'User retrieved successfully'
		)

		return {
			data: user,
			metadata: {
				retrievedAt: new Date().toISOString()
			}
		}
	}
}
