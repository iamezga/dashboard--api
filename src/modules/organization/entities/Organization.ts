/**
 * @interface Organization
 * @description Represents the core domain entity for an Organization.
 * This defines the properties of an organization within the application,
 * independent of the underlying database schema.
 */
export interface Organization {
	id: string
	name: string
	slug: string
	email: string | null
	phone: string | null
	address: string | null
	timezone: string
	scope: 'TENANT' | 'SYSTEM'
	config: Record<string, any>
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface OrganizationBasicInfo
 * @description Represents minimal organization information needed for authentication and session management.
 * Used in authenticated user context to avoid loading full organization data.
 */
export interface OrganizationBasicInfo {
	id: string
	name: string
	timezone: string
	scope: 'TENANT' | 'SYSTEM'
}

/**
 * @interface OrganizationCreateInput
 * @description Defines the input structure for creating a new Organization entity.
 */
export interface OrganizationCreateInput {
	name: string
	slug: string
	email?: string | null
	phone?: string | null
	address?: string | null
	timezone?: string
	config?: Record<string, any>
}

/**
 * @interface OrganizationUpdateInput
 * @description Defines the input structure for updating an existing Organization entity.
 */
export interface OrganizationUpdateInput {
	name?: string
	slug?: string
	email?: string | null
	phone?: string | null
	address?: string | null
	timezone?: string
	config?: Record<string, any>
	deletedAt?: Date | null
}
