import { BadRequestError, ForbiddenError, NotFoundError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { User, UserUpdateInput } from '../../entities/User'
import { UserUpdateJobInterface } from './UserUpdateJobInterface'

/**
 * @class UserUpdateUseCase
 * @description Administrative use case for updating other users within the same organization.
 * Allows updating name, surname, email, roleId, active status, and config.
 *
 * IMPORTANT: This use case does NOT allow self-edit. Users must use UserUpdateSelfUseCase
 * to update their own profile. This separation ensures clear audit trails and prevents
 * accidental privilege escalation (e.g., admin changing their own role).
 *
 * Password changes should use UserChangePasswordUseCase instead.
 *
 * @permission user.update
 * @scope ORGANIZATION - Can update other users within the same organization (not self)
 */
export class UserUpdateUseCase extends UseCase<UserUpdateJobInterface> {
	static readonly permission: string = 'user.update'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `user.update` permission check.
	 * It dynamically generates the schema based on the permission config.
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		const { id } = job.getData() as { id: string }
		const organizationId = job.getUser().organizationId

		// Get the user being updated for permission validation
		const user = await container.repositoryManager
			.get('user')
			.findById(id, organizationId)

		if (!user) {
			throw new NotFoundError(`User with ID ${id} not found`)
		}

		return this.buildPermissionSchema(this.permission, job)
	}

	/**
	 * Executes the business logic for administrative user updates.
	 * @param {UserUpdateJobInterface} job - The Job object containing the user update data.
	 * @returns {Promise<UseCaseResponseInterface<User>>} A promise that resolves to the updated user entity.
	 * @throws {NotFoundError} If the user does not exist.
	 * @throws {BadRequestError} If the roleId is invalid or inactive.
	 * @throws {Error} For unexpected internal errors during user update.
	 */
	public async run(
		job: UserUpdateJobInterface
	): Promise<UseCaseResponseInterface<User>> {
		const { id, name, surname, email, roleId, active, config } = job.getData()
		const organizationId = job.getUser().organizationId

		// Find the existing user
		const existingUser = await this.container.repositoryManager
			.get('user')
			.findById(id, organizationId)

		if (!existingUser) {
			throw new NotFoundError(`User with ID ${id} not found`)
		}

		// Prevent self-edit: admin users must use user.update.self for their own profile
		const isUpdatingSelf = job.getUser().id === id
		if (isUpdatingSelf) {
			throw new ForbiddenError(
				'Cannot update your own profile using this endpoint. Use the self-update endpoint instead.'
			)
		}

		// Check email uniqueness if email is being changed
		if (email && email !== existingUser.email) {
			const emailExists = await this.container.repositoryManager
				.get('user')
				.findByEmail(email, organizationId)

			if (emailExists) {
				throw new BadRequestError('A user with this email already exists', [
					{
						field: 'email',
						message: 'This email is already in use.',
						type: 'emailExists'
					}
				])
			}
		}

		// Prepare update data object
		const updateData: Partial<UserUpdateInput> = {}

		// Add name if provided
		if (name !== undefined) {
			updateData.name = name
		}

		// Add surname if provided
		if (surname !== undefined) {
			updateData.surname = surname
		}

		// Add email if provided
		if (email !== undefined) {
			updateData.email = email
		}

		// If roleId is provided, validate it exists and is active
		if (roleId !== undefined) {
			const role = await this.container.repositoryManager
				.get('role')
				.findById(roleId, organizationId)

			if (!role || !role.active) {
				throw new BadRequestError('Invalid Role', [
					{
						field: 'roleId',
						message: 'The provided role ID is invalid or inactive.',
						type: 'invalidRole'
					}
				])
			}

			updateData.roleId = roleId
		}

		// Add active status if provided
		if (active !== undefined) {
			updateData.active = active
		}

		// Merge config if provided (preserve existing config, only update sent fields)
		if (config !== undefined) {
			updateData.config = this.container.utils.deepMerge(
				existingUser.config as Record<string, any>,
				config
			)
		}

		// Update user
		const updatedUser = await this.container.repositoryManager
			.get('user')
			.update(id, updateData, organizationId)

		job.logger.info(`User ${updatedUser.email} updated successfully.`)

		return {
			data: updatedUser,
			metadata: {
				attempts: job.getAttempts(),
				message: 'User updated successfully.'
			}
		}
	}
}
