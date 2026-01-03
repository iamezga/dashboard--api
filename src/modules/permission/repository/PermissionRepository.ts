import { RepositoryManager } from '@/core/repositoryManager'
import { Prisma } from '@/generated/prisma/client'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { PermissionMapper } from '@/utils/mappers'
import { Logger } from 'pino'
import {
	Permission,
	PermissionCreateInput,
	PermissionUpdateInput
} from '../entities/Permission'
import { PermissionRepositoryInterface } from '../entities/PermissionRepositoryInterface'

export type PermissionRepositoryContext = {
	repositoryManager: RepositoryManager
	logger: Logger
}

/**
 * @class PermissionRepository
 * @description Implements PermissionRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles mapping between domain entities and Prisma models for permissions.
 */
export class PermissionRepository implements PermissionRepositoryInterface {
	static name = 'permission' as const
	static provider: keyof DatabaseClientsMap = 'postgres'
	private context!: PermissionRepositoryContext
	private permissionMapper = new PermissionMapper()

	constructor(readonly db: DatabaseClientsMap['postgres']) {}

	/**
	 * Injects the dependency container into the repository instance.
	 * This allows the repository to access other services or repositories from the container.
	 * @param {DependencyContainer} container - The main dependency container.
	 */
	setContext(container: DependencyContainer): void {
		const { repositoryManager, logger } = container
		this.context = {
			repositoryManager,
			logger
		}
		this.context.logger.info(`Repository context ready.`)
	}

	/**
	 * Finds a permission by id.
	 * @param {string} id - The ID of the permission.
	 * @returns {Promise<Permission | null>} The permission entity or null if not found.
	 */
	async findById(id: string): Promise<Permission | null> {
		const prismaPermission = await this.db.permission.findUnique({
			where: { id, deletedAt: null }
		})
		return this.permissionMapper.mapOrNull(prismaPermission)
	}

	/**
	 * Creates a new permission.
	 * @param {PermissionCreateInput} data - The data for the new permission.
	 * @returns {Promise<Permission>} The created permission entity.
	 */
	async create(data: PermissionCreateInput): Promise<Permission> {
		const prismaPermission = await this.db.permission.create({
			data: {
				...data
			} as Prisma.PermissionCreateInput
		})
		return this.permissionMapper.mapToDomain(prismaPermission)
	}

	/**
	 * Updates an existing permission.
	 * @param {string} id - The ID of the permission to update.
	 * @param {PermissionUpdateInput} data - The partial data to update.
	 * @returns {Promise<Permission | null>} The updated permission entity or null if not found.
	 */
	async update(
		id: string,
		data: PermissionUpdateInput
	): Promise<Permission | null> {
		const prismaPermission = await this.db.permission.update({
			where: { id },
			data: data as Prisma.PermissionUpdateInput
		})
		return this.permissionMapper.mapOrNull(prismaPermission)
	}

	/**
	 * Deletes a permission by ID (soft delete).
	 * @param {string} id - The ID of the permission to delete.
	 * @returns {Promise<boolean>} True if the permission was marked as deleted, false otherwise.
	 */
	async delete(id: string): Promise<boolean> {
		const permission = await this.db.permission.update({
			where: { id },
			data: { deletedAt: new Date() },
			select: { id: true } // Select just ID to confirm update
		})
		return !!permission
	}

	/**
	 * Find all active permissions.
	 * @returns {Promise<Permission[]>} An array of permission entities.
	 */
	async findAll(): // organizationId is ignored
	Promise<Permission[]> {
		const prismaPermissions = await this.db.permission.findMany({
			where: {
				active: true,
				deletedAt: null // Only fetch non-deleted permissions
			}
		})
		return this.permissionMapper.mapArrayToDomain(prismaPermissions)
	}

	/**
	 * Finds a permission by key.
	 * @param {string} key - The unique key of the permission.
	 * @returns {Promise<Permission | null>} The permission entity or null if not found.
	 */
	async findByKey(key: string): Promise<Permission | null> {
		const prismaPermission = await this.db.permission.findUnique({
			where: { key, deletedAt: null }
		})
		return this.permissionMapper.mapOrNull(prismaPermission)
	}

	/**
	 * Finds multiple permissions by keys.
	 * @param {string[]} keys - An array of permission keys.
	 * @returns {Promise<Permission[]>} An array of permission entities found.
	 */
	async findByKeys(keys: string[]): Promise<Permission[]> {
		const prismaPermissions = await this.db.permission.findMany({
			where: {
				key: {
					in: keys
				},
				active: true,
				deletedAt: null // Only retrieve non-deleted permissions
			}
		})
		return this.permissionMapper.mapArrayToDomain(prismaPermissions)
	}
}
