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
 * - Basic user fields (id, name, email, status)
 * - User configuration (stored as JSON in Prisma, mapped to Record<string, any> in domain)
 * - Timestamps (createdAt, updatedAt, deletedAt)
 *
 * This mapper is used across the application wherever user data is retrieved from the database
 * and needs to be represented in the domain layer. It ensures consistency in how user data is
 * structured and accessed throughout the codebase.
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
			name: prismaUser.name,
			surname: prismaUser.surname,
			email: prismaUser.email,
			status: prismaUser.status,
			lastLogin: prismaUser.lastLogin,
			config: prismaUser.config as Record<string, any>,
			createdAt: prismaUser.createdAt,
			updatedAt: prismaUser.updatedAt,
			deletedAt: prismaUser.deletedAt
		}
	}
}
