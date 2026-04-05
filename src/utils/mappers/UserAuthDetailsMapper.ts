import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
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
 * - Organization memberships with role and organization details
 * - Raw permission data for each membership (unfiltered)
 * - User configuration and metadata
 *
 * This design allows the domain layer to have full visibility of the user's
 * authentication context while keeping the mapping logic focused on data transformation.
 */
export class UserAuthDetailsMapper extends BaseMapper<
	UserAuthDetailsPayload,
	UserAuthDetails
> {
	/**
	 * Transforms a Prisma User with nested auth data to a domain UserAuthDetails entity.
	 * This method assumes that the input data has already been filtered for active/non-deleted
	 * permissions at the database query level. It simply maps the raw data structure to the domain entity.
	 *
	 * @param {UserAuthDetailsPayload} prismaUserSubset - The user from Prisma with nested auth details
	 * @returns {UserAuthDetails} The domain auth details entity with user, memberships, roles, and permissions data
	 */
	mapToDomain(prismaUserSubset: UserAuthDetailsPayload): UserAuthDetails {
		return {
			id: prismaUserSubset.id,
			email: prismaUserSubset.email,
			passwordHash: prismaUserSubset.passwordHash,
			status: prismaUserSubset.status,
			name: prismaUserSubset.name,
			surname: prismaUserSubset.surname,
			config: prismaUserSubset.config as Record<string, any>,
			memberships: (prismaUserSubset.memberships || []).map(m => ({
				id: m.id,
				organization: {
					id: m.organization.id,
					name: m.organization.name,
					timezone: m.organization.timezone,
					scope: m.organization.scope
				},
				role: {
					id: m.role.id,
					name: m.role.name,
					label: m.role.label,
					scope: m.role.scope
				},
				status: m.status,
				isOwner: m.isOwner,
				config: m.config as Record<string, any>,
				invitedAt: m.invitedAt,
				joinedAt: m.joinedAt,
				createdAt: m.createdAt,
				updatedAt: m.updatedAt,
				deletedAt: m.deletedAt
			})),
			lastLogin: prismaUserSubset.lastLogin,
			createdAt: prismaUserSubset.createdAt,
			updatedAt: prismaUserSubset.updatedAt,
			deletedAt: prismaUserSubset.deletedAt
		}
	}
}
