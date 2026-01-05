import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import {
	Permission,
	PermissionCreateInput,
	PermissionUpdateInput
} from './Permission'

/**
 * @interface PermissionRepositoryInterface
 * @extends RepositoryInterface
 * @description Defines the contract for permission data access operations.
 * Extends base CRUD operations and adds permission-specific methods for
 * finding permissions by key and bulk retrieval.
 *
 * Permissions control access to features and use cases throughout the application.
 * They can be SYSTEM-scoped (platform-wide) or TENANT-scoped (organization-specific).
 */
export interface PermissionRepositoryInterface
	extends RepositoryInterface<
		Permission,
		PermissionCreateInput,
		PermissionUpdateInput
	> {
	/**
	 * Finds a permission by its ID.
	 *
	 * @param {string} id - The permission ID
	 * @returns {Promise<Permission | null>} The permission if found, null otherwise
	 */
	findById(id: string): Promise<Permission | null>

	/**
	 * Creates a new permission.
	 *
	 * @param {PermissionCreateInput} data - The permission data to create
	 * @returns {Promise<Permission>} The created permission entity
	 */
	create(data: PermissionCreateInput): Promise<Permission>

	/**
	 * Updates an existing permission.
	 *
	 * @param {string} id - The permission ID to update
	 * @param {PermissionUpdateInput} data - The fields to update
	 * @returns {Promise<Permission | null>} The updated permission if found, null otherwise
	 */
	update(id: string, data: PermissionUpdateInput): Promise<Permission | null>

	/**
	 * Deletes a permission by ID.
	 *
	 * @param {string} id - The permission ID to delete
	 * @returns {Promise<boolean>} True if deleted successfully, false otherwise
	 */
	delete(id: string): Promise<boolean>

	/**
	 * Finds a permission by its unique key identifier.
	 *
	 * @param {string} key - The permission key (e.g., 'user.create', 'auth.login')
	 * @returns {Promise<Permission | null>} The permission if found, null otherwise
	 */
	findByKey(key: string): Promise<Permission | null>

	/**
	 * Retrieves multiple permissions by their keys in a single query.
	 *
	 * @param {string[]} keys - Array of permission keys to retrieve
	 * @returns {Promise<Permission[]>} Array of found permissions
	 */
	findByKeys(keys: string[]): Promise<Permission[]>
}
