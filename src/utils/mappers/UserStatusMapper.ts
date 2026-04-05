import { User as PrismaUserModel } from '@/generated/prisma/client'
import { UserStatus } from '@/modules/user/entities/User'
import { BaseMapper } from './BaseMapper'

// Type for the partial Prisma user object with only status fields
type PrismaUserStatusPayload = Pick<
	PrismaUserModel,
	'status' | 'config' | 'lastLogin' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

/**
 * @class UserStatusMapper
 * @extends BaseMapper
 * @description Maps partial Prisma User models to domain UserStatus entities.
 * Handles only status-related fields for lightweight user status checks.
 *
 * This mapper is optimized for use cases that only need to verify user status
 * without loading complete user data. Common use cases:
 * - Pre-authentication status checks
 * - Active/inactive validation
 * - Last login tracking
 */
export class UserStatusMapper extends BaseMapper<
	PrismaUserStatusPayload,
	UserStatus
> {
	/**
	 * Transforms partial Prisma User status data to a domain UserStatus entity.
	 *
	 * @param {PrismaUserStatusPayload} prismaUserStatus - Partial user data with status fields
	 * @returns {UserStatus} The domain user status entity
	 */
	mapToDomain(prismaUserStatus: PrismaUserStatusPayload): UserStatus {
		return {
			status: prismaUserStatus.status,
			config: prismaUserStatus.config as Record<string, any>,
			lastLogin: prismaUserStatus.lastLogin,
			createdAt: prismaUserStatus.createdAt,
			updatedAt: prismaUserStatus.updatedAt,
			deletedAt: prismaUserStatus.deletedAt
		}
	}
}
