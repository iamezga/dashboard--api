import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { PermissionScope } from '@/modules/permission/entities/Permission'
import { UserAuthDetailsPayload } from '@/modules/user/repository/UserRepository'
import { BaseMapper } from './BaseMapper'

/**
 * Mapper for transforming Prisma User models with authentication details to domain UserAuthDetails entities.
 * This mapper handles the complex nested structure of user permissions.
 *
 * NOTE: This is a pure data mapper - it does NOT apply business rules or filtering.
 * Permission filtering (active, non-deleted, etc.) should be done in the application layer.
 */
export class UserAuthDetailsMapper extends BaseMapper<
	UserAuthDetailsPayload,
	UserAuthDetails
> {
	/**
	 * Maps a Prisma User with authentication details to a domain UserAuthDetails entity.
	 * @param {UserAuthDetailsPayload} prismaUserSubset - The user object from Prisma with nested permissions.
	 * @returns {UserAuthDetails} The mapped UserAuthDetails DTO with raw permission data.
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
			lastLogin: prismaUserSubset.lastLogin,
			createdAt: prismaUserSubset.createdAt,
			updatedAt: prismaUserSubset.updatedAt,
			deletedAt: prismaUserSubset.deletedAt
		}
	}
}
