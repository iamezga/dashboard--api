/**
 * @interface Organization
 * @description Represents the core domain entity for an Organization.
 * This defines the properties of an organization within the application,
 * independent of the underlying database schema.
 */
export interface Organization {
	id: string
	name: string
	email: string | null
	phone: string | null
	address: string | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface OrganizationCreateInput
 * @description Defines the input structure for creating a new Organization entity.
 */
export interface OrganizationCreateInput {
	name: string
	email?: string | null
	phone?: string | null
	address?: string | null
}

/**
 * @interface OrganizationUpdateInput
 * @description Defines the input structure for updating an existing Organization entity.
 */
export interface OrganizationUpdateInput {
	name?: string
	email?: string | null
	phone?: string | null
	address?: string | null
	deletedAt?: Date | null
}
