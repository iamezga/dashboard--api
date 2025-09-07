import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { User, UserRepoCreateInput, UserStatus, UserUpdateInput } from './User'

export interface UserRepositoryInterface
	extends RepositoryInterface<User, DatabaseClients['postgres']> {
	readonly name?: 'UserRepository'

	/**
	 * Finds a user by email.
	 * @param email - The email address of the user.
	 * @returns {Promise<User | null>} The user entity or null if not found.
	 */
	findByEmail(email: string): Promise<User | null>

	/**
	 * Finds a user by email and retrieves specific fields needed for authentication.
	 * @param email - The email address of the user.
	 * @returns {Promise<UserAuthDetails | null>} The authentication-specific user details or null if not found.
	 */
	findUserAuthDetailsByEmail(email: string): Promise<UserAuthDetails | null>

	/**
	 * Finds a user status by id, retrieving essential user status fields.
	 * @param id - User id.
	 * @returns {Promise<UserAuthDetails | null>}
	 */
	findStatusById(id: string): Promise<UserStatus | null>

	/**
	 * Creates a new user.
	 * @param {UserRepoCreateInput} data - Data for the new user, including password hash.
	 * @returns {Promise<User>} The created User entity.
	 */
	create(data: UserRepoCreateInput): Promise<User>

	/**
	 * Updates an existing user.
	 * @param id - The ID of the user to update.
	 * @param data - The partial data to update.
	 * @returns {Promise<User | null>} The updated user entity or null if not found.
	 */
	update(id: string, data: UserUpdateInput): Promise<User | null>
}
