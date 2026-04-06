import { Membership } from '@/modules/membership/entities/Membership'
import { Permission } from '@/modules/permission/entities/Permission'

/**
 * @interface UserPermission
 * @description Represents the domain entity for a UserPermission.
 * This interface defines the properties of a custom permission override
 * assigned to a user, independent of the underlying database schema.
 */
export interface UserPermission {
	config: Record<string, any>
	assignedAt: Date
	deletedAt: Date | null
	disabled: boolean
	permission: Permission
}

/**
 * @interface MergedPermissionData
 * @description Represents a single permission with its effective, merged configuration
 * for a specific user session. This includes properties from the Permission entity
 * and the final configuration resulting from merging permission config, role-specific,
 * and user-specific overrides.
 */
export interface UserMergedPermissions {
	[key: string]: Permission
}

/**
 * @interface User
 * @description Represents the domain entity for a User within the application.
 * This interface defines user properties from a business logic perspective,
 * independent of the underlying database schema.
 */
export interface User {
	id: string
	name: string
	surname: string | null
	email: string
	status: string
	lastLogin: Date | null
	config: Record<string, any>
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface AuthenticatedUser
 * @description Represents a User entity that has been successfully authenticated,
 * and for which permissions are guaranteed to be present and available.
 * Includes minimal organization information needed for permission validation.
 */
export interface AuthenticatedUser extends User {
	memberships: Membership[]
	membership:
		| Pick<Membership, 'id' | 'organization' | 'role' | 'permissions'>
		| undefined
}

/**
 * @interface UserCreateInput
 * @description Defines the input structure for creating a new User entity from the perspective of the UseCase/Job.
 * This input includes the raw password that will be hashed by the UseCase.
 */
export interface UserCreateInput {
	name: string
	surname?: string | null
	email: string
	passwordHash: string
	status?: string
	config?: Record<string, any>
}

/**
 * @interface UserRepoCreateInput
 * @description Defines the input structure for creating a new User entity specifically for the Repository.
 * This input includes the passwordHash which has already been processed by the UseCase.
 */
export interface UserCreateInput {
	name: string
	surname?: string | null
	email: string
	passwordHash: string
	status?: string
	config?: Record<string, any>
}
/**
 * @interface UserUpdateInput
 * @description Defines the input structure for updating an existing User.
 */
export interface UserUpdateInput {
	name?: string
	surname?: string | null
	email?: string
	passwordHash?: string
	status?: string
	lastLogin?: Date | null
	config?: Record<string, any>
	deletedAt?: Date | null
}

export interface UserStatus {
	status: string
	config: Record<string, any>
	lastLogin: Date | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}
