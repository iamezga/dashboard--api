import { DependencyContainer } from '@/core/dependencyContainer'
import { RepositoryManager } from '@/core/repositoryManager'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { Prisma, Permission as PrismaPermissionModel } from '@prisma/client'
import { Logger } from 'pino'
import {
	Permission,
	PermissionCreateInput,
	PermissionScope,
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
	 * Maps a Prisma-generated Permission object to the app domain Permission interface.
	 * @param {PrismaPermissionModel} prismaPermission - The permission object returned by PrismaClient.
	 * @returns {Permission} The mapped domain Permission entity.
	 */
	private mapPrismaPermissionToDomain(
		prismaPermission: PrismaPermissionModel
	): Permission {
		return {
			id: prismaPermission.id,
			key: prismaPermission.key,
			label: prismaPermission.label,
			description: prismaPermission.description,
			active: prismaPermission.active,
			config: prismaPermission.config as Record<string, any>,
			moduleId: prismaPermission.moduleId,
			scope: prismaPermission.scope as PermissionScope,
			createdAt: prismaPermission.createdAt,
			updatedAt: prismaPermission.updatedAt,
			deletedAt: prismaPermission.deletedAt
		}
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
		return prismaPermission
			? this.mapPrismaPermissionToDomain(prismaPermission)
			: null
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
		return prismaPermission
			? this.mapPrismaPermissionToDomain(prismaPermission)
			: null
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
		return prismaPermissions.map(this.mapPrismaPermissionToDomain)
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
		return this.mapPrismaPermissionToDomain(prismaPermission)
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
		return prismaPermission
			? this.mapPrismaPermissionToDomain(prismaPermission)
			: null
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
	async findAll(): Promise<Permission[]> {
		const prismaPermissions = await this.db.permission.findMany({
			where: {
				active: true,
				deletedAt: null // Only fetch non-deleted permissions
			}
		})
		return prismaPermissions.map(this.mapPrismaPermissionToDomain)
	}
}
