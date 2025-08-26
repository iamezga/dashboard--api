import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { UserRepositoryInterface } from '@/modules/user/entities/UserRepositoryInterface'
import { DatabaseClients } from '@/services/databaseServiceManager'
import { Prisma, User as PrismaUserModel } from '@prisma/client'
import { User, UserRepoCreateInput, UserUpdateInput } from '../entities/User'

export class PostgresUserRepository implements UserRepositoryInterface {
	constructor(readonly db: DatabaseClients['postgres']) {}

	/**
	 * Maps a full Prisma User model to the domain User entity.
	 * @param {PrismaUserModel} prismaUser - The user object returned by PrismaClient.
	 * @returns {User} The mapped domain User entity.
	 */
	private mapPrismaUserToDomain(prismaUser: PrismaUserModel): User {
		return {
			id: prismaUser.id,
			organizationId: prismaUser.organizationId,
			name: prismaUser.name,
			surname: prismaUser.surname,
			email: prismaUser.email,
			active: prismaUser.active,
			lastLogin: prismaUser.lastLogin,
			roleId: prismaUser.roleId,
			config: prismaUser.config as object,
			createdAt: prismaUser.createdAt,
			updatedAt: prismaUser.updatedAt,
			deletedAt: prismaUser.deletedAt
		}
	}

	/**
	 * Maps a subset of Prisma User properties to the UserAuthDetails DTO.
	 * This is used for authentication-specific data retrieval.
	 * @param {Pick<PrismaUserModel, 'id' | 'organizationId' | 'email' | 'passwordHash' | 'active' | 'name' | 'surname' | 'roleId' | 'config' | 'lastLogin'>} prismaUserSubset - The partial user object from Prisma.
	 * @returns {UserAuthDetails} The mapped UserAuthDetails DTO.
	 */
	private mapPrismaAuthDetailsToDomain(
		prismaUserSubset: Pick<
			PrismaUserModel,
			| 'id'
			| 'organizationId'
			| 'email'
			| 'passwordHash'
			| 'active'
			| 'name'
			| 'surname'
			| 'roleId'
			| 'config'
			| 'lastLogin'
		>
	): UserAuthDetails {
		return {
			id: prismaUserSubset.id,
			organizationId: prismaUserSubset.organizationId,
			email: prismaUserSubset.email,
			passwordHash: prismaUserSubset.passwordHash,
			active: prismaUserSubset.active,
			name: prismaUserSubset.name,
			surname: prismaUserSubset.surname,
			roleId: prismaUserSubset.roleId,
			config: prismaUserSubset.config as object,
			lastLogin: prismaUserSubset.lastLogin
		}
	}

	/**
	 * Finds a user by id.
	 * @param id - The ID of the user.
	 * @returns {Promise<User | null>}
	 */
	async findById(id: string): Promise<User | null> {
		const prismaUser = await this.db.user.findUnique({
			where: { id }
		})
		return prismaUser ? this.mapPrismaUserToDomain(prismaUser) : null
	}

	/**
	 * Finds a user by email.
	 * @param email - The email address of the user.
	 * @returns {Promise<User | null>}
	 */
	async findByEmail(email: string): Promise<User | null> {
		const prismaUser = await this.db.user.findUnique({
			where: { email }
		})
		return prismaUser ? this.mapPrismaUserToDomain(prismaUser) : null
	}

	/**
	 * Finds a user by email, retrieving essential authentication fields.
	 * @param email - The email address of the user.
	 * @returns {Promise<UserAuthDetails | null>}
	 */
	async findUserAuthDetailsByEmail(
		email: string
	): Promise<UserAuthDetails | null> {
		const prismaUser = await this.db.user.findUnique({
			where: { email },
			select: {
				id: true,
				organizationId: true,
				email: true,
				passwordHash: true,
				active: true,
				name: true,
				surname: true,
				roleId: true,
				config: true,
				lastLogin: true
			}
		})
		return prismaUser ? this.mapPrismaAuthDetailsToDomain(prismaUser) : null
	}

	/**
	 * Creates a new user.
	 * @param data - The data for the new user.
	 * @returns {Promise<User>} The created user entity.
	 */
	async create(data: UserRepoCreateInput): Promise<User> {
		const prismaUser = await this.db.user.create({
			data: {
				...data
			} as Prisma.UserCreateInput
		})
		return this.mapPrismaUserToDomain(prismaUser)
	}

	/**
	 * Updates an existing user.
	 * @param id - The ID of the user to update.
	 * @param data - The partial data to update.
	 * @returns {Promise<User | null>} The updated user entity or null if not found.
	 */
	async update(id: string, data: UserUpdateInput): Promise<User | null> {
		const prismaUser = await this.db.user.update({
			where: { id },
			data: data as Prisma.UserUpdateInput
		})
		return prismaUser ? this.mapPrismaUserToDomain(prismaUser) : null
	}

	/**
	 * Deletes a user by ID. (soft delete)
	 * @param id - The ID of the user to delete.
	 * @returns {Promise<boolean>} True if the user was marked as deleted.
	 */
	async delete(id: string): Promise<boolean> {
		const user = await this.db.user.update({
			where: { id },
			data: { deletedAt: new Date() },
			select: { id: true }
		})
		return !!user
	}

	/**
	 * Retrieves all active users (where `deletedAt` is null).
	 * @returns {Promise<User[]>} An array of user entities.
	 */
	async findAll(): Promise<User[]> {
		const prismaUsers = await this.db.user.findMany({
			where: {
				deletedAt: null
			}
		})
		return prismaUsers.map(this.mapPrismaUserToDomain)
	}
}
