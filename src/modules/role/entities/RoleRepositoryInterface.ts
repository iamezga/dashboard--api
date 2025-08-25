import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { Role, RoleWithPermissions } from './Role'

/**
 * @interface RoleRepositoryInterface
 * @description Defines the contract for role data access operations.
 * Extends base CRUD operations.
 */
export interface RoleRepositoryInterface
	extends RepositoryInterface<Role, DatabaseClients['postgres']> {
	readonly name?: 'RoleRepository'

	/**
	 * Finds role by name within a specific organization (or globally if organizationId is null).
	 * @param {string} name - The unique name of the role.
	 * @param {string | null} organizationId - The ID of the organization or null for global roles.
	 * @returns {Promise<Role | null>} The role entity or null if not found.
	 */
	findByName(name: string, organizationId: string | null): Promise<Role | null>

	/**
	 * Finds role by ID and includes its associated permissions.
	 * @param {string} id - The ID of the role.
	 * @returns {Promise<RoleWithPermissions | null>} The role entity with permissions or null.
	 */
	findByIdWithPermissions(id: string): Promise<RoleWithPermissions | null>

	/**
	 * Assigns multiple permissions to a role.
	 * @param {string} roleId - The ID of the role.
	 * @param {string[]} permissionIds - An array of permission IDs to assign.
	 * @returns {Promise<void>}
	 */
	assignPermissionsToRole(
		roleId: string,
		permissionIds: string[]
	): Promise<void>

	/**
	 * Removes multiple permissions from a role.
	 * @param {string} roleId - The ID of the role.
	 * @param {string[]} permissionIds - An array of permission IDs to remove.
	 * @returns {Promise<void>}
	 */
	removePermissionsFromRole(
		roleId: string,
		permissionIds: string[]
	): Promise<void>
}
