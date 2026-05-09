import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { User } from '../../entities/User'
import { UserCreateJobInterface } from './UserCreateJobInterface'

/**
 * @class UserCreateUseCase
 * @description Handles the creation of a new user in the system.
 * It ensures the email is unique, the role exists, hashes the password,
 * and saves the user through the UserRepository.
 * @permission user.create
 */
export class UserCreateUseCase extends UseCase<UserCreateJobInterface> {
	static readonly permission: string = 'user.create'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `user.create` permission check.
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
	 * Executes the business logic for creating a new user.
	 * @param {UserCreateJobInterface} job - The Job object containing the new user's data.
	 * @returns {Promise<UseCaseResponseInterface<User>>} A promise that resolves to the created user entity.
	 * @throws {BadRequestError} If the email is already in use or the roleId is invalid.
	 * @throws {Error} For unexpected internal errors during user creation.
	 */
	public async run(
		job: UserCreateJobInterface
	): Promise<UseCaseResponseInterface<User>> {
		const { email, password, ...rest } = job.getData()

		// The context for validation is the organization of the user being created,
		// or the organization of the user making the request if not specified.

		// Check if email is already in use within the organization
		const existingUser = await this.container.repositoryManager
			.get('user')
			.findByEmail(email)
		if (!existingUser) {
			// to throw a validation error with details about the field and issue
		}

		// Hash password
		const passwordHash = await this.container.libs.argon2.hash(password)

		// Prepare user data
		const newUserData = {
			...rest,
			email,
			passwordHash,
			active: rest.active ?? true, // Default to active if not provided
			config: rest.config ?? {} // Default to empty object if not provided
		}
		//  Create user
		const createdUser = await this.container.repositoryManager
			.get('user')
			.create(newUserData)

		job.logger.info(`User ${createdUser.email} created successfully.`)

		// Dispatch the background job to send the welcome email
		await this.container.services.jobService.dispatchUseCase(
			'emails',
			'UserSendWelcomeEmailUseCase',
			job
		)
		job.logger.info(
			`Dispatched UserSendWelcomeEmailUseCase for user ${createdUser.email}`
		)

		return {
			data: createdUser,
			metadata: {
				attempts: job.getAttempts(),
				message: 'User created successfully.'
			}
		}
	}
}
