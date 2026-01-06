import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { PermissionScope } from '@/modules/permission/entities/Permission'
import { UserAuthDetailsPayload } from '@/modules/user/repository/UserRepository'
import { BaseMapper } from './BaseMapper'

/**
 * @class UserAuthDetailsMapper
 * @extends BaseMapper
 * @description Maps Prisma User models with authentication details to domain UserAuthDetails entities.
 * Handles complex nested structure including user data, role, organization,
 * role permissions, and user-specific permission overrides.
 *
 * This mapper performs PURE DATA TRANSFORMATION only - it does NOT apply
 * business rules or filtering. Permission filtering (active, non-deleted, etc.)
 * should be done at the application/use case layer.
 *
 * The resulting UserAuthDetails includes:
 * - User identification and status
 * - Organization and role information
 * - Role-level permissions (from role assignment)
 * - User-level permission overrides (specific to user)
 */
export class UserAuthDetailsMapper extends BaseMapper<
	UserAuthDetailsPayload,
	UserAuthDetails
> {
	/**
	 * Transforms a Prisma User with nested auth data to a domain UserAuthDetails entity.
	 * Includes role, organization, and permission data without filtering.
	 *
	 * @param {UserAuthDetailsPayload} prismaUserSubset - The user from Prisma with nested auth details
	 * @returns {UserAuthDetails} The domain auth details entity with raw permission data
	 */
	mapToDomain(prismaUserSubset: UserAuthDetailsPayload): UserAuthDetails {
		// Pure mapping - no filtering, no business logic
		const mappedUserPermissions = prismaUserSubset.userPermissions.map(up => ({
			config: up.config as Record<string, any>,
			deletedAt: up.deletedAt,
			disabled: up.disabled,
			assignedAt: up.assignedAt,
			permission: {
				...up.permission,
				scope: up.permission.scope as PermissionScope,
				config: { ...(up.permission.config as Record<string, any>) }
			}
		}))

		return {
			id: prismaUserSubset.id,
			organizationId: prismaUserSubset.organizationId,
			email: prismaUserSubset.email,
			passwordHash: prismaUserSubset.passwordHash,
			active: prismaUserSubset.active,
			name: prismaUserSubset.name,
			surname: prismaUserSubset.surname,
			roleId: prismaUserSubset.roleId,
			config: prismaUserSubset.config as Record<string, any>,
			userPermissions: mappedUserPermissions,
			organization: {
				id: prismaUserSubset.organization.id,
				name: prismaUserSubset.organization.name,
				timezone: prismaUserSubset.organization.timezone,
				scope: prismaUserSubset.organization.scope
			},
			lastLogin: prismaUserSubset.lastLogin,
			createdAt: prismaUserSubset.createdAt,
			updatedAt: prismaUserSubset.updatedAt,
			deletedAt: prismaUserSubset.deletedAt
		}
	}
}
