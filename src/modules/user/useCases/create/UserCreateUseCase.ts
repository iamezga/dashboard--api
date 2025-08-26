import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { OrganizationRepositoryInterface } from '@/modules/organization'
import { DependencyContainer } from '@/services/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { hash } from 'argon2'
import { RoleRepositoryInterface } from '../../../role/entities/RoleRepositoryInterface'
import { User } from '../../entities/User'
import { UserRepositoryInterface } from '../../entities/UserRepositoryInterface'
import { UserCreateJobInterface } from './UserCreateJobInterface'

/**
 * @class UserCreateUseCase
 * @description Handles the creation of a new user in the system.
 * It ensures the email is unique, the role exists, hashes the password,
 * and saves the user through the UserRepository.
 * @permission user.create
 */
export class UserCreateUseCase extends UseCase<UserCreateJobInterface> {
	private userRepository: UserRepositoryInterface
	private roleRepository: RoleRepositoryInterface
	private organizationRepository: OrganizationRepositoryInterface
	private argon2Hash: typeof hash

	constructor(container: DependencyContainer) {
		super(container)
		this.userRepository = container.repositories.user
		this.roleRepository = container.repositories.role
		this.organizationRepository = container.repositories.organization
		this.argon2Hash = container.thirdParties.argon2.hash
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
		const existingUser = await this.userRepository.findByEmail(email)
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
		const role = await this.roleRepository.findById(roleId)
		if (!role || !role.active) {
			throw new BadRequestError('Invalid Role', [
				{
					field: 'roleId',
					message: 'The provided role ID is invalid or inactive.',
					type: 'invalidRole'
				}
			])
		}

		const organization = await this.organizationRepository.findById(
			organizationId
		)
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
		const passwordHash = await this.argon2Hash(password)

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
		const createdUser = await this.userRepository.create(newUserData)

		this.container.logger.info(
			`User ${createdUser.email} created successfully.`
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
