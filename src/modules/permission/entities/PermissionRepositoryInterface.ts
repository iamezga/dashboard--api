import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { Permission } from './Permission'

/**
 * @interface PermissionRepositoryInterface
 * @description Defines the contract for permission data access operations.
 * Extends base CRUD operations.
 */
export interface PermissionRepositoryInterface
	extends RepositoryInterface<Permission, DatabaseClients['postgres']> {
	readonly name?: 'PermissionRepository'

	/**
	 * Finds a permission by key.
	 * @param {string} key - The unique key of the permission (e.g., 'user.create').
	 * @returns {Promise<Permission | null>} The permission entity or null if not found.
	 */
	findByKey(key: string): Promise<Permission | null>

	/**
	 * Finds multiple permissions by keys.
	 * @param {string[]} keys - An array of permission keys.
	 * @returns {Promise<Permission[]>} An array of permission entities found.
	 */
	findByKeys(keys: string[]): Promise<Permission[]>
}
