import { BadRequestError, NotFoundError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { User, UserUpdateInput } from '../../entities/User'
import { UserUpdateSelfJobInterface } from './UserUpdateSelfJobInterface'

/**
 * @class UserUpdateSelfUseCase
 * @description Allows users to update their own profile information.
 * Users can modify basic profile fields (name, surname, email, config) but cannot
 * change sensitive fields like roleId or active status.
 *
 * This use case enforces that users can only update their own profile by validating
 * that the authenticated user ID matches the target user ID.
 *
 * For password changes, use UserChangePasswordUseCase instead.
 * For administrative updates of other users, use UserUpdateUseCase.
 *
 * @permission user.update.self
 * @scope SELF - Can only update own profile
 */
export class UserUpdateSelfUseCase extends UseCase<UserUpdateSelfJobInterface> {
	static readonly permission: string = 'user.update.self'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `user.update.self` permission check.
	 * It dynamically generates the schema based on the permission config.
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
	 * Executes the business logic for self profile update.
	 * @param {UserUpdateSelfJobInterface} job - The Job object containing the self update data.
	 * @returns {Promise<UseCaseResponseInterface<User>>} A promise that resolves to the updated user entity.
	 * @throws {NotFoundError} If the user does not exist.
	 * @throws {BadRequestError} If the email already exists.
	 * @throws {Error} For unexpected internal errors during user update.
	 */
	public async run(
		job: UserUpdateSelfJobInterface
	): Promise<UseCaseResponseInterface<User>> {
		const { name, surname, email, config } = job.getData()
		const userId = job.getUser().id
		const organizationId = job.getUser().organizationId

		// Find the authenticated user's profile
		const existingUser = await this.container.repositoryManager
			.get('user')
			.findById(userId, organizationId)

		if (!existingUser) {
			throw new NotFoundError(`User profile not found`)
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

		// Prepare update data object (only allowed fields)
		const updateData: Partial<UserUpdateInput> = {}

		// Add name if provided
		if (name !== undefined) {
			updateData.name = name
		}

		// Add surname if provided
		if (surname !== undefined) {
			updateData.surname = surname
		}

		// Add email if provided and changed
		if (email !== undefined && email !== existingUser.email) {
			updateData.email = email
		}

		// Merge config if provided (preserve existing config, only update sent fields)
		if (config !== undefined) {
			updateData.config = this.container.utils.deepMerge(
				existingUser.config as Record<string, any>,
				config
			)
		}

		// Update user (only if there are changes)
		if (Object.keys(updateData).length === 0) {
			return {
				data: existingUser,
				metadata: {
					attempts: job.getAttempts(),
					message: 'No changes to update.'
				}
			}
		}

		const updatedUser = await this.container.repositoryManager
			.get('user')
			.update(userId, updateData, organizationId)

		job.logger.info(
			`User ${updatedUser.email} updated own profile successfully.`
		)

		return {
			data: updatedUser,
			metadata: {
				attempts: job.getAttempts(),
				message: 'Profile updated successfully.'
			}
		}
	}
}
