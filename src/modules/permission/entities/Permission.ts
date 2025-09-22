export type PermissionScope = 'GLOBAL' | 'ORGANIZATION' | 'MODULE' | 'USER'

/**
 * @interface Permission
 * @description Represents the core domain entity for a Permission.
 * This defines the properties of a permission within the application,
 * independent of the underlying database schema.
 */
export interface Permission {
	id: string
	key: string // Unique identifier for the permission (e.g., 'user.create', 'role.read')
	label: string // short description
	description: string | null
	scope: PermissionScope
	config: Record<string, any>
	active: boolean
	moduleId: string | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface PermissionCreateInput
 * @description Defines the input structure for creating a new Permission entity.
 */
export interface PermissionCreateInput {
	key: string
	label: string
	description?: string | null
	scope?: PermissionScope
	config?: Record<string, any>
	active?: boolean
	moduleId?: string | null
}

/**
 * @interface PermissionUpdateInput
 * @description Defines the input structure for updating an existing Permission entity.
 */
export interface PermissionUpdateInput {
	key?: string
	label?: string
	description?: string | null
	scope?: PermissionScope
	config?: Record<string, any>
	active?: boolean
	moduleId?: string | null
	deletedAt?: Date | null
}
