import { DatabaseClients } from '@/services/databaseServiceManager'
import { Prisma, Permission as PrismaPermissionModel } from '@prisma/client'
import {
	Permission,
	PermissionCreateInput,
	PermissionUpdateInput
} from '../entities/Permission'
import { PermissionRepositoryInterface } from '../entities/PermissionRepositoryInterface'

/**
 * @class PostgresPermissionRepository
 * @description Implements PermissionRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles mapping between domain entities and Prisma models for permissions.
 */
export class PostgresPermissionRepository
	implements PermissionRepositoryInterface
{
	constructor(readonly db: DatabaseClients['postgres']) {}

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
