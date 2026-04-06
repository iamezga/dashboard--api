import { Prisma } from '@/generated/prisma/client'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { UserAuthDetails } from '@/modules/auth/entities/AuthDataTypes'
import { UserRepositoryInterface } from '@/modules/user/entities/UserRepositoryInterface'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import {
	UserAuthDetailsMapper,
	UserMapper,
	UserStatusMapper
} from '@/utils/mappers'
import { Logger } from 'pino'
import {
	User,
	UserCreateInput,
	UserStatus,
	UserUpdateInput
} from '../entities/User'

// This type ensures that the permissions and the related permission data are loaded.
const userAuthDetailsInclude = {
	memberships: {
		include: {
			organization: {
				select: {
					id: true,
					name: true,
					timezone: true,
					scope: true
				}
			},
			role: true
		}
	}
} as const

// The type for the raw Prisma user object with the required relations
export type UserAuthDetailsPayload = Prisma.UserGetPayload<{
	include: typeof userAuthDetailsInclude
}>

/**
 * @class UserRepository
 * @description Handles all user-related database operations using Prisma.
 *
 * Constructor Injection:
 * - Receives DependencyContainer in constructor
 * - Extracts only needed dependencies (repositoryManager, logger)
 * - 100% ready to use immediately after instantiation
 * - No two-phase initialization required
 */
export class UserRepository implements UserRepositoryInterface {
	static name = 'user' as const
	static provider: keyof DatabaseClientsMap = 'postgres'
	private userMapper = new UserMapper()
	private userAuthDetailsMapper = new UserAuthDetailsMapper()
	private userStatusMapper = new UserStatusMapper()
	private readonly logger: Logger

	/**
	 * Creates a new UserRepository instance.
	 *
	 * @param {DatabaseClientsMap['postgres']} db - The Prisma client for Postgres
	 * @param {DependencyContainer} container - The dependency container with services and other repositories
	 *
	 * Architecture:
	 * - Extract only required dependencies from container
	 * - Allows flexible dependency changes in future (no breaking changes to constructor)
	 * - Makes dependencies explicit and testable
	 */
	constructor(
		private readonly db: DatabaseClientsMap['postgres'],
		container: DependencyContainer
	) {
		this.logger = container.logger

		this.logger.info(`Repository initialized: ${UserRepository.name}`)
	}

	/**
	 * Finds a user by id.
	 * @param id - The ID of the user.
	 * @returns {Promise<User | null>}
	 */
	async findById(id: string): Promise<User | null> {
		const prismaUser = await this.db.user.findUnique({
			where: { id, deletedAt: null }
		})
		return this.userMapper.mapOrNull(prismaUser)
	}

	/**
	 * Creates a new user
	 * Memberships should be created separately (invitation or organization creation flow).
	 * @param data - The data for the new user.
	 * @returns {Promise<User>} The created user entity.
	 */
	async create(data: UserCreateInput): Promise<User> {
		const prismaUser = await this.db.user.create({ data })
		return this.userMapper.mapToDomain(prismaUser)
	}

	/**
	 * Updates an existing user.
	 * @param id - The ID of the user to update.
	 * @param data - The partial data to update.
	 * @returns {Promise<User>} The updated user entity.
	 * @throws {Error} If the user is not found (Prisma throws PrismaClientKnownRequestError with code P2025).
	 */
	async update(id: string, data: UserUpdateInput): Promise<User> {
		const prismaUser = await this.db.user.update({
			where: { id },
			data: data as Prisma.UserUpdateInput
		})
		return this.userMapper.mapToDomain(prismaUser)
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
			where: { deletedAt: null }
		})
		return this.userMapper.mapArrayToDomain(prismaUsers)
	}

	/**
	 * Finds a user by their email address.
	 * @param email - The email address of the user.
	 * @returns {Promise<User | null>}
	 */
	async findByEmail(email: string): Promise<User | null> {
		const prismaUser = await this.db.user.findUnique({ where: { email } })
		return this.userMapper.mapOrNull(prismaUser)
	}

	/**
	 * Finds a user by email, retrieving essential authentication fields.
	 * This is a convenience method optimized for authentication workflows.
	 *
	 * NOTE: Returns raw permission data without filtering. Business logic
	 * (filtering active/deleted permissions) should be applied in the use case layer.
	 *
	 * @param email - The email address of the user.
	 * @returns {Promise<UserAuthDetails | null>} User with raw permissions, or null if not found.
	 */
	async findUserAuthDetailsByEmail(
		email: string
	): Promise<UserAuthDetails | null> {
		const prismaUser = await this.db.user.findUnique({
			where: { email },
			include: userAuthDetailsInclude
		})
		return this.userAuthDetailsMapper.mapOrNull(prismaUser)
	}

	/**
	 * Finds a user status by id, retrieving essential status fields.
	 * @param id - User id.
	 * @returns {Promise<UserAuthDetails | null>}
	 */
	async findStatusById(id: string): Promise<UserStatus | null> {
		const user = await this.db.user.findUnique({
			where: { id },
			select: {
				status: true,
				lastLogin: true,
				config: true,
				createdAt: true,
				updatedAt: true,
				deletedAt: true
			}
		})
		return this.userStatusMapper.mapOrNull(user)
	}
}
