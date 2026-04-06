import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import { User, UserCreateInput, UserStatus, UserUpdateInput } from './User'

/**
 * @interface UserRepositoryInterface
 * @extends RepositoryInterface
 * @description Defines the contract for user data access operations.
 * Extends base CRUD operations and adds user-specific retrieval methods
 * including authentication details and status checks.
 *
 * This interface ensures data isolation by organization (multi-tenancy)
 * and provides methods for user lookup by email, authentication verification,
 * and status checking.
 */
export interface UserRepositoryInterface extends RepositoryInterface<
	User,
	UserCreateInput,
	UserUpdateInput
> {
	/**
	 * Finds a user by their email
	 *
	 * @param {string} email - The email address to search for
	 * @returns {Promise<User | null>} The user entity if found, null otherwise
	 */
	findByEmail(email: string): Promise<User | null>

	/**
	 * Retrieves complete authentication details for a user by email.
	 * Includes user data, role, permissions, and organization information.
	 *
	 * @param {string} email - The email address to search for
	 * @returns {Promise<UserAuthDetails | null>} Complete auth details if found, null otherwise
	 */
	findUserAuthDetailsByEmail(email: string): Promise<UserAuthDetails | null>

	/**
	 * Retrieves the current status of a user (active/inactive).
	 *
	 * @param {string} id - The user ID
	 * @returns {Promise<UserStatus | null>} The user status if found, null otherwise
	 */
	findStatusById(id: string): Promise<UserStatus | null>
}
