import { User as PrismaUserModel } from '@/generated/prisma/client'
import { User } from '@/modules/user/entities/User'
import { BaseMapper } from './BaseMapper'

/**
 * Maps Prisma User model to domain User entity.
 * Centralizes user data transformation logic.
 */
export class UserMapper extends BaseMapper<PrismaUserModel, User> {
	mapToDomain(prismaUser: PrismaUserModel): User {
		return {
			id: prismaUser.id,
			organizationId: prismaUser.organizationId,
			name: prismaUser.name,
			surname: prismaUser.surname,
			email: prismaUser.email,
			active: prismaUser.active,
			lastLogin: prismaUser.lastLogin,
			roleId: prismaUser.roleId,
			config: prismaUser.config as Record<string, any>,
			createdAt: prismaUser.createdAt,
			updatedAt: prismaUser.updatedAt,
			deletedAt: prismaUser.deletedAt
		}
	}
}
