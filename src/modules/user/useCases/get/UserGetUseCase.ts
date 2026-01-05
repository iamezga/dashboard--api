import { NotFoundError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { User } from '../../entities/User'
import { UserGetJobInterface } from './UserGetJobInterface'

/**
 * @class UserGetUseCase
 * @description Retrieves a single user by ID with multi-tenancy validation.
 *
 * Use Case Flow:
 * 1. Extract user ID from request data
 * 2. Validate user has 'user.get' permission
 * 3. Query user by ID within requesting user's organization
 * 4. Return user data or throw NotFoundError
 *
 * Multi-tenancy:
 * - Only returns users from the same organization as the requesting user
 * - Prevents cross-organization data access
 *
 * @permission user.get
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

	/**
	 * Executes the business logic for retrieving a user by ID.
	 * @param {UserGetJobInterface} job - The Job object containing the user ID to retrieve.
	 * @returns {Promise<UseCaseResponseInterface<User>>} A promise that resolves to the user entity.
	 * @throws {NotFoundError} If the user is not found within the organization.
	 */
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
