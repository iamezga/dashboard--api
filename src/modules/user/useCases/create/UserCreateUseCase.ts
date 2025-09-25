import { DependencyContainer } from '@/core/dependencyContainer'
import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
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
		const permissions = job.getUser().permissions

		const data = {
			permission: UserCreateUseCase.permission
		}
		const schema = {
			permission: {
				type: 'enum',
				values: Object.keys(permissions)
			}
		}

		return { schema, data }
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
		const { email, password, roleId, organizationId, ...rest } = job.getData()

		// Check if email is already in use (deleted or not)
		const existingUser = await this.container.repositoryManager
			.get('user')
			.findByEmail(email)
		if (existingUser) {
			throw new BadRequestError('Email already in use', [
				{
					field: 'email',
					message: 'This email is already registered.',
					type: 'emailExists'
				}
			])
		}

		// Validate if the roleId exists
		const role = await this.container.repositoryManager
			.get('role')
			.findById(roleId)
		if (!role || !role.active) {
			throw new BadRequestError('Invalid Role', [
				{
					field: 'roleId',
					message: 'The provided role ID is invalid or inactive.',
					type: 'invalidRole'
				}
			])
		}

		const organization = await this.container.repositoryManager
			.get('organization')
			.findById(organizationId)
		if (!organization) {
			throw new BadRequestError('Invalid Organization', [
				{
					field: 'organizationId',
					message: 'The provided organization ID is invalid or inactive.',
					type: 'invalidOrganization'
				}
			])
		}

		// Hash password
		const passwordHash = await this.container.libs.argon2.hash(password)

		// Prepare user data
		const newUserData = {
			...rest,
			email,
			passwordHash,
			roleId,
			organizationId,
			active: rest.active ?? true, // Default to active if not provided
			config: rest.config ?? {} // Default to empty object if not provided
		}

		//  Create user
		const createdUser = await this.container.repositoryManager
			.get('user')
			.create(newUserData)

		job.logger.info(`User ${createdUser.email} created successfully.`)

		// Dispatch the background job to send the welcome email
		await this.container.services.jobService.add(
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
