import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import {
	Role,
	RoleCreateInput,
	RoleUpdateInput,
	RoleWithPermissions
} from './Role'

/**
 * @interface RoleRepositoryInterface
 * @extends RepositoryInterface
 * @description Defines the contract for role data access operations.
 * Extends base CRUD operations and adds role-specific methods for
 * finding roles by key and retrieving roles with their associated permissions.
 *
 * Supports multi-tenancy through organization-scoped roles and system-wide
 * roles (SYSTEM scope). Enables RBAC (Role-Based Access Control) by providing
 * methods to retrieve role configurations and permissions.
 */
export interface RoleRepositoryInterface
	extends RepositoryInterface<Role, RoleCreateInput, RoleUpdateInput> {
	/**
	 * Retrieves a role with all its associated permissions.
	 * Includes permission configuration and metadata.
	 *
	 * @param {string} id - The role ID
	 * @param {string} [organizationId] - Optional organization ID for tenant-scoped roles
	 * @returns {Promise<RoleWithPermissions | null>} Role with permissions if found, null otherwise
	 */
	findByIdWithPermissions(
		id: string,
		organizationId?: string
	): Promise<RoleWithPermissions | null>

	/**
	 * Finds a role by its name within a specific organization.
	 *
	 * @param {string} name - The role name to search for
	 * @param {string} organizationId - The organization ID for multi-tenant isolation
	 * @returns {Promise<Role | null>} The role if found, null otherwise
	 */
	findByName(name: string, organizationId: string): Promise<Role | null>

	/**
	 * Assigns multiple permissions to a role.
	 *
	 * @param {string} roleId - The role ID to assign permissions to
	 * @param {string[]} permissionIds - Array of permission IDs to assign
	 * @param {string} [organizationId] - Optional organization ID for tenant-scoped roles
	 * @returns {Promise<void>}
	 */
	assignPermissionsToRole(
		roleId: string,
		permissionIds: string[],
		organizationId?: string
	): Promise<void>

	/**
	 * Removes multiple permissions from a role.
	 *
	 * @param {string} roleId - The role ID to remove permissions from
	 * @param {string[]} permissionIds - Array of permission IDs to remove
	 * @param {string} [organizationId] - Optional organization ID for tenant-scoped roles
	 * @returns {Promise<void>}
	 */
	removePermissionsFromRole(
		roleId: string,
		permissionIds: string[],
		organizationId?: string
	): Promise<void>
}
