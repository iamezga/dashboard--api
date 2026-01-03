import { RepositoryManager } from '@/core/repositoryManager'
import { Prisma } from '@/generated/prisma/client'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { RoleMapper, RoleWithPermissionsMapper } from '@/utils/mappers'
import { Logger } from 'pino'
import {
	Role,
	RoleCreateInput,
	RoleUpdateInput,
	RoleWithPermissions
} from '../entities/Role'
import { RoleRepositoryInterface } from '../entities/RoleRepositoryInterface'

const roleWithPermissionsInclude = {
	rolePermissions: {
		where: { deletedAt: null },
		include: {
			permission: true
		}
	}
} as const // `as const` ensures literal types for keys for better inference

export type RoleWithPermissionsPayload = Prisma.RoleGetPayload<{
	include: typeof roleWithPermissionsInclude
}>

/**
 * @class RoleRepository
 * @description Implements RoleRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles mapping between domain entities and Prisma models for roles,
 * and manages role-permission relationships.
 *
 * Constructor Injection:
 * - Receives DependencyContainer in constructor
 * - Extracts only needed dependencies (repositoryManager, logger)
 * - 100% ready to use immediately after instantiation
 * - No two-phase initialization required
 */
export class RoleRepository implements RoleRepositoryInterface {
	static name = 'role' as const
	static provider: keyof DatabaseClientsMap = 'postgres'
	private roleMapper = new RoleMapper()
	private roleWithPermissionsMapper = new RoleWithPermissionsMapper()

	// Dependencies extracted from container
	private readonly repositoryManager: RepositoryManager
	private readonly logger: Logger

	/**
	 * Creates a new RoleRepository instance.
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
		readonly db: DatabaseClientsMap['postgres'],
		container: DependencyContainer
	) {
		this.repositoryManager = container.repositoryManager
		this.logger = container.logger

		this.logger.info(`Repository initialized: ${RoleRepository.name}`)
	}

	/**
	 * Finds a role by its unique identifier.
	 * @param {string} id - The ID of the role.
	 * @param {string} [organizationId] - Optional. The ID of the organization to scope the search.
	 * @returns {Promise<Role | null>} The role entity or null if not found.
	 */
	async findById(id: string, organizationId?: string): Promise<Role | null> {
		const whereClause: Prisma.RoleWhereInput = {
			id,
			deletedAt: null
		}

		if (organizationId) {
			whereClause.organizationId = organizationId
		}

		const prismaRole = await this.db.role.findFirst({
			where: whereClause
		})
		return this.roleMapper.mapOrNull(prismaRole)
	}

	/**
	 * Creates a new role and optionally assigns permissions.
	 * @param {RoleCreateInput} data - The data for the new role, including optional permissionKeys.
	 * @returns {Promise<Role>} The created role entity.
	 */
	async create(data: RoleCreateInput): Promise<Role> {
		const { permissionKeys, ...roleData } = data

		const createData: Prisma.RoleCreateInput = {
			...roleData,
			organization: data.organizationId
				? { connect: { id: data.organizationId } }
				: undefined
		} as Prisma.RoleCreateInput

		if (permissionKeys && permissionKeys.length > 0) {
			// Get valid permission IDs
			const permissions = await this.repositoryManager
				.get('permission')
				.findByKeys(permissionKeys)
			if (permissions.length !== permissionKeys.length) {
				throw new Error('One or more permission keys are invalid or not found.')
			}
			createData.rolePermissions = {
				create: permissions.map(p => ({
					permissionId: p.id,
					config: {} // Default configuration for the RolePermission relationship
				}))
			}
		}

		const prismaRole = await this.db.role.create({
			data: createData
		})
		return this.roleMapper.mapToDomain(prismaRole)
	}

	/**
	 * Updates an existing role and manages its permissions.
	 * @param {string} id - The ID of the role to update.
	 * @param {RoleUpdateInput} data - The partial data to update, including optional permissionKeysToAdd/ToRemove.
	 * @param {string} [organizationId] - Optional. The ID of the organization to scope the update.
	 * @returns {Promise<Role | null>} The updated role entity or null if not found.
	 */
	async update(
		id: string,
		data: RoleUpdateInput,
		organizationId?: string
	): Promise<Role | null> {
		const whereClause: Prisma.RoleWhereUniqueInput = { id }
		if (organizationId) {
			whereClause.organizationId = organizationId
		}
		const { permissionKeysToAdd, permissionKeysToRemove, ...roleData } = data

		const updateData: Prisma.RoleUpdateInput = {
			...roleData,
			organization: roleData.organizationId
				? { connect: { id: roleData.organizationId } }
				: undefined
		} as Prisma.RoleUpdateInput

		if (permissionKeysToAdd && permissionKeysToAdd.length > 0) {
			const permissions = await this.repositoryManager
				.get('permission')
				.findByKeys(permissionKeysToAdd)
			if (permissions.length !== permissionKeysToAdd.length) {
				throw new Error(
					'One or more permission keys to add are invalid or not found.'
				)
			}
			// Connect permissions to the role (Prisma automatically handles creation if the relationship doesn't exist)
			updateData.rolePermissions = {
				upsert: permissions.map(p => ({
					where: { roleId_permissionId: { roleId: id, permissionId: p.id } },
					update: { deletedAt: null }, // If it existed, reactivate it
					create: { permissionId: p.id, config: {} }
				}))
			}
		}

		if (permissionKeysToRemove && permissionKeysToRemove.length > 0) {
			const permissions = await this.repositoryManager
				.get('permission')
				.findByKeys(permissionKeysToRemove)
			if (permissions.length !== permissionKeysToRemove.length) {
				throw new Error(
					'One or more permission keys to remove are invalid or not found.'
				)
			}
			// Mark relationships as logically deleted
			await this.db.rolePermission.updateMany({
				where: {
					roleId: id,
					permissionId: { in: permissions.map(p => p.id) }
				},
				data: { deletedAt: new Date() }
			})
		}

		const prismaRole = await this.db.role.update({
			where: whereClause,
			data: updateData
		})
		return this.roleMapper.mapOrNull(prismaRole)
	}

	/**
	 * Deletes a role by its ID (logical deletion by setting 'deletedAt').
	 * Also logically deletes all associated role-permission relations.
	 * @param {string} id - The ID of the role to delete.
	 * @param {string} [organizationId] - Optional. The ID of the organization to scope the deletion.
	 * @returns {Promise<boolean>} True if the role was marked as deleted, false otherwise.
	 */
	async delete(id: string, organizationId?: string): Promise<boolean> {
		const whereClause: Prisma.RoleWhereUniqueInput = { id }
		if (organizationId) {
			whereClause.organizationId = organizationId
		}

		await this.db.$transaction(async prismaTransaction => {
			// Mark the role as deleted
			await prismaTransaction.role.update({
				where: whereClause,
				data: { deletedAt: new Date() }
			})

			// Mark all associated RolePermission relationships as deleted
			await prismaTransaction.rolePermission.updateMany({
				where: { roleId: id },
				data: { deletedAt: new Date() }
			})
		})

		return true // If the transaction was successful
	}

	/**
	 * Retrieves all active and non-deleted roles.
	 * @param {string} [organizationId] - Optional. The ID of the organization to scope the search.
	 * @returns {Promise<Role[]>} An array of role entities.
	 */
	async findAll(organizationId?: string): Promise<Role[]> {
		const whereClause: Prisma.RoleWhereInput = {
			active: true,
			deletedAt: null
		}
		if (organizationId) {
			whereClause.organizationId = organizationId
		}
		const prismaRoles = await this.db.role.findMany({
			where: whereClause
		})
		return this.roleMapper.mapArrayToDomain(prismaRoles)
	}

	/**
	 * Finds a role by its ID and includes its associated permissions.
	 * @param {string} id - The ID of the role.
	 * @param {string} [organizationId] - Optional. The ID of the organization to scope the search.
	 * @returns {Promise<RoleWithPermissions | null>} The role entity with permissions or null.
	 */
	async findByIdWithPermissions(
		id: string,
		organizationId?: string
	): Promise<RoleWithPermissions | null> {
		const whereClause: Prisma.RoleWhereInput = {
			id,
			deletedAt: null
		}
		if (organizationId) {
			whereClause.organizationId = organizationId
		}
		const prismaRole = await this.db.role.findFirst({
			where: whereClause,
			include: roleWithPermissionsInclude
		})
		return this.roleWithPermissionsMapper.mapOrNull(prismaRole)
	}

	/**
	 * Finds a role by its name within a specific organization (or globally if organizationId is null).
	 * @param {string} name - The unique name of the role.
	 * @param {string | null} organizationId - The ID of the organization or null for global roles.
	 * @returns {Promise<Role | null>} The role entity or null if not found.
	 */
	async findByName(name: string, organizationId: string): Promise<Role | null> {
		const prismaRole = await this.db.role.findFirst({
			where: {
				name,
				organizationId,
				deletedAt: null
			}
		})
		return this.roleMapper.mapOrNull(prismaRole)
	}

	/**
	 * Assigns multiple permissions to a role.
	 * @param {string} roleId - The ID of the role.
	 * @param {string[]} permissionIds - An array of permission IDs to assign.
	 * @returns {Promise<void>}
	 */
	async assignPermissionsToRole(
		roleId: string,
		permissionIds: string[],
		organizationId?: string
	): Promise<void> {
		const whereClause: Prisma.RoleWhereUniqueInput = { id: roleId }
		if (organizationId) {
			whereClause.organizationId = organizationId
		}

		// Create or reactivate RolePermission relationships.
		await this.db.$transaction(async tx => {
			// First, ensure the role exists in the given organization context
			const role = await tx.role.findFirst({ where: whereClause })
			if (!role) {
				throw new Error(
					'Role not found or does not belong to the specified organization.'
				)
			}

			await tx.rolePermission.createMany({
				data: permissionIds.map(pid => ({
					roleId: roleId,
					permissionId: pid,
					config: {}
				})),
				skipDuplicates: true // Does not fail if the relationship already exists
			})

			// Ensure that relationships that might have been logically deleted are reactivated
			await tx.rolePermission.updateMany({
				where: {
					roleId: roleId,
					permissionId: { in: permissionIds },
					deletedAt: { not: null }
				},
				data: { deletedAt: null }
			})
		})
	}

	/**
	 * Removes multiple permissions from a role (logical deletion of the relationship).
	 * @param {string} roleId - The ID of the role.
	 * @param {string[]} permissionIds - An array of permission IDs to remove.
	 * @returns {Promise<void>}
	 */
	async removePermissionsFromRole(
		roleId: string,
		permissionIds: string[],
		organizationId?: string
	): Promise<void> {
		const whereClause: Prisma.RoleWhereUniqueInput = { id: roleId }
		if (organizationId) {
			whereClause.organizationId = organizationId
		}

		await this.db.$transaction(async tx => {
			const role = await tx.role.findFirst({ where: whereClause })
			if (!role) {
				throw new Error(
					'Role not found or does not belong to the specified organization.'
				)
			}
			await tx.rolePermission.updateMany({
				where: {
					roleId: roleId,
					permissionId: { in: permissionIds },
					deletedAt: null // Only if not already logically deleted
				},
				data: { deletedAt: new Date() }
			})
		})
	}
}
