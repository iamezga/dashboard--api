import { Permission } from '../../permission/entities/Permission'

/**
 * @interface Role
 * @description Represents the core domain entity for a Role.
 * This defines the properties of a role within the application,
 * independent of the underlying database schema.
 */
export interface Role {
	id: string
	organizationId: string | null // Nullable for global/system roles not tied to a specific organization
	name: string // Unique name within an organization (e.g., 'superAdmin', 'viewer')
	label: string // Human-readable name for UI (e.g., 'Super Administrador')
	description: string | null
	active: boolean
	scope: 'TENANT' | 'SYSTEM'
	config: Record<string, any> // Role-specific configurations (e.g., default dashboard, theme)
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
	permissions?: Permission[]
}

/**
 * @interface RoleCreateInput
 * @description Defines the input structure for creating a new Role entity.
 */
export interface RoleCreateInput {
	organizationId?: string | null
	name: string
	label: string
	description?: string | null
	active?: boolean
	config?: Record<string, any>
	permissionKeys?: string[]
}

/**
 * @interface RoleUpdateInput
 * @description Defines the input structure for updating an existing Role entity.
 */
export interface RoleUpdateInput {
	organizationId?: string | null
	name?: string
	label?: string
	description?: string | null
	active?: boolean
	config?: Record<string, any>
	deletedAt?: Date | null
	permissionKeysToAdd?: string[]
	permissionKeysToRemove?: string[]
}

/**
 * @interface RolePermissionDetail
 * @description Represents a permission with its specific configuration when assigned to a role.
 * This is used within RoleWithPermissions to provide access to the `config` from `RolePermission`.
 */
export interface RolePermissionDetail {
	permission: Permission // The actual Permission entity
	config: Record<string, any> // The configuration specific to this role-permission assignment
}

/**
 * @interface RoleWithPermissions
 * @description Extends Role to include its associated permissions.
 * Useful for scenarios where the full role and its permissions are needed.
 */
export interface RoleWithPermissions extends Role {
	rolePermissions: RolePermissionDetail[]
}
