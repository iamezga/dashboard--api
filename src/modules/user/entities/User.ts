import { MergedPermissionData } from '@/modules/session/entities/Session'

/**
 * @interface User
 * @description Represents the domain entity for a User within the application.
 * This interface defines user properties from a business logic perspective,
 * independent of the underlying database schema.
 */
export interface User {
	id: string
	organizationId: string
	name: string
	surname: string | null
	email: string
	active: boolean
	lastLogin: Date | null
	roleId: string
	config: Record<string, any>
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface AuthenticatedUser
 * @description Represents a User entity that has been successfully authenticated,
 * and for which permissions are guaranteed to be present and available.
 */
export interface AuthenticatedUser extends User {
	permissions: Record<string, MergedPermissionData>
}

/**
 * @interface UserCreateInput
 * @description Defines the input structure for creating a new User entity from the perspective of the UseCase/Job.
 * This input includes the raw password that will be hashed by the UseCase.
 */
export interface UserCreateInput {
	organizationId: string
	name: string
	surname?: string | null
	email: string
	password: string
	active?: boolean
	roleId: string
	config?: Record<string, any>
}

/**
 * @interface UserRepoCreateInput
 * @description Defines the input structure for creating a new User entity specifically for the Repository.
 * This input includes the passwordHash which has already been processed by the UseCase.
 */
export interface UserRepoCreateInput {
	organizationId: string
	name: string
	surname?: string | null
	email: string
	passwordHash: string
	active?: boolean
	roleId: string
	config?: Record<string, any>
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
	config?: Record<string, any>
	deletedAt?: Date | null
}

export interface UserStatus {
	active: boolean
	config: Record<string, any>
	lastLogin: Date | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}
