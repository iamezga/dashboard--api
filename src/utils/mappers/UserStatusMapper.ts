import { User as PrismaUserModel } from '@/generated/prisma/client'
import { UserStatus } from '@/modules/user/entities/User'
import { BaseMapper } from './BaseMapper'

// Type for the partial Prisma user object with only status fields
type PrismaUserStatusPayload = Pick<
	PrismaUserModel,
	'active' | 'config' | 'lastLogin' | 'createdAt' | 'updatedAt' | 'deletedAt'
>

/**
 * Mapper for transforming partial Prisma User models to domain UserStatus entities.
 * This mapper handles only status-related fields.
 */
export class UserStatusMapper extends BaseMapper<
	PrismaUserStatusPayload,
	UserStatus
> {
	/**
	 * Maps a partial Prisma User to a domain UserStatus entity.
	 * @param {PrismaUserStatusPayload} prismaUserStatus - The partial user object from Prisma.
	 * @returns {UserStatus} The mapped domain UserStatus entity.
	 */
	mapToDomain(prismaUserStatus: PrismaUserStatusPayload): UserStatus {
		return {
			active: prismaUserStatus.active,
			config: prismaUserStatus.config as Record<string, any>,
			lastLogin: prismaUserStatus.lastLogin,
			createdAt: prismaUserStatus.createdAt,
			updatedAt: prismaUserStatus.updatedAt,
			deletedAt: prismaUserStatus.deletedAt
		}
	}
}
