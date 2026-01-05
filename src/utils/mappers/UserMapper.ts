import { User as PrismaUserModel } from '@/generated/prisma/client'
import { User } from '@/modules/user/entities/User'
import { BaseMapper } from './BaseMapper'

/**
 * @class UserMapper
 * @extends BaseMapper
 * @description Maps Prisma User model to domain User entity.
 * Centralizes user data transformation logic and ensures the domain layer
 * remains independent of Prisma's database schema.
 *
 * Handles transformation of:
 * - User identification (id, email)
 * - Organization relationship (multi-tenancy)
 * - Role assignment (RBAC)
 * - User configuration (JSON field)
 * - Timestamps (createdAt, updatedAt, deletedAt)
 */
export class UserMapper extends BaseMapper<PrismaUserModel, User> {
	/**
	 * Transforms a Prisma User model to a domain User entity.
	 *
	 * @param {PrismaUserModel} prismaUser - The Prisma user model from database
	 * @returns {User} The domain user entity
	 */
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
