/**
 * @interface User
 * @description Represents the domain entity for a User within the application.
 * This interface defines user properties from a business logic perspective,
 * independent of the underlying database schema.
 */
export interface User {
	id: string
	organizationId: string | null
	name: string
	surname: string | null
	email: string
	active: boolean
	lastLogin: Date | null
	roleId: string | null
	config: object
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface UserCreateInput
 * @description Defines the input structure for creating a new User.
 * This might differ from the full User entity or Prisma's create input.
 */
export interface UserCreateInput {
	organizationId?: string | null
	name: string
	surname?: string | null
	email: string
	passwordHash: string
	active?: boolean
	roleId?: string | null
	config?: object
}

/**
 * @interface UserUpdateInput
 * @description Defines the input structure for updating an existing User.
 */
export interface UserUpdateInput {
	organizationId?: string | null
	name?: string
	surname?: string | null
	email?: string
	passwordHash?: string
	active?: boolean
	lastLogin?: Date | null
	roleId?: string | null
	config?: object
	deletedAt?: Date | null
}
