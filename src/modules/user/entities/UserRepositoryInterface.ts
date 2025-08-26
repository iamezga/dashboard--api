import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { User, UserRepoCreateInput } from './User'

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
	 * Creates a new user.
	 * @param {UserRepoCreateInput} data - Data for the new user, including password hash.
	 * @returns {Promise<User>} The created User entity.
	 */
	create(data: UserRepoCreateInput): Promise<User>
}
