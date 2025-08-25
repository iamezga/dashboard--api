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
	config: object // Role-specific configurations (e.g., default dashboard, theme)
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
	config?: object
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
	config?: object
	deletedAt?: Date | null
	permissionKeysToAdd?: string[]
	permissionKeysToRemove?: string[]
}

/**
 * @interface RoleWithPermissions
 * @description Extends Role to include its associated permissions.
 * Useful for scenarios where the full role and its permissions are needed.
 */
export interface RoleWithPermissions extends Role {
	permissions: Permission[]
}
