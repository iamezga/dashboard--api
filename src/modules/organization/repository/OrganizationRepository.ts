import { DependencyContainer } from '@/core/dependencyContainer'
import { RepositoryManager } from '@/core/repositoryManager'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { Prisma, Organization as PrismaOrganizationModel } from '@prisma/client'
import { Logger } from 'pino'
import {
	Organization,
	OrganizationCreateInput,
	OrganizationUpdateInput
} from '../entities/Organization'
import { OrganizationRepositoryInterface } from '../entities/OrganizationRepositoryInterface'

export type OrganizationRepositoryContext = {
	repositoryManager: RepositoryManager
	logger: Logger
}

/**
 * @class OrganizationRepository
 * @description Implements OrganizationRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles mapping between domain entities and Prisma models for organizations.
 */
export class OrganizationRepository implements OrganizationRepositoryInterface {
	static name = 'organization' as const
	static provider: keyof DatabaseClientsMap = 'postgres'
	private context!: OrganizationRepositoryContext

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
	 * Maps a Prisma-generated Organization object to the app domain Organization interface.
	 * @param {PrismaOrganizationModel} prismaOrganization - The organization object returned by PrismaClient.
	 * @returns {Organization} The mapped domain Organization entity.
	 */
	private mapPrismaOrganizationToDomain(
		prismaOrganization: PrismaOrganizationModel
	): Organization {
		return {
			id: prismaOrganization.id,
			name: prismaOrganization.name,
			email: prismaOrganization.email,
			phone: prismaOrganization.phone,
			address: prismaOrganization.address,
			createdAt: prismaOrganization.createdAt,
			updatedAt: prismaOrganization.updatedAt,
			deletedAt: prismaOrganization.deletedAt
		}
	}

	/**
	 * Finds organization by ID.
	 * @param {string} id - The ID of the organization.
	 * @returns {Promise<Organization | null>} The organization entity or null if not found.
	 */
	async findById(id: string): Promise<Organization | null> {
		const prismaOrganization = await this.db.organization.findUnique({
			where: {
				id,
				deletedAt: null
			}
		})
		return prismaOrganization
			? this.mapPrismaOrganizationToDomain(prismaOrganization)
			: null
	}

	/**
	 * Creates a new organization.
	 * @param {OrganizationCreateInput} data - The data for the new organization.
	 * @returns {Promise<Organization>} The created organization entity.
	 */
	async create(data: OrganizationCreateInput): Promise<Organization> {
		const prismaOrganization = await this.db.organization.create({
			data: {
				...data
			} as Prisma.OrganizationCreateInput
		})
		return this.mapPrismaOrganizationToDomain(prismaOrganization)
	}

	/**
	 * Updates an existing organization.
	 * @param {string} id - The ID of the organization to update.
	 * @param {OrganizationUpdateInput} data - The partial data to update.
	 * @returns {Promise<Organization | null>} The updated organization entity or null if not found.
	 */
	async update(
		id: string,
		data: OrganizationUpdateInput
	): Promise<Organization | null> {
		const prismaOrganization = await this.db.organization.update({
			where: { id },
			data: data as Prisma.OrganizationUpdateInput
		})
		return prismaOrganization
			? this.mapPrismaOrganizationToDomain(prismaOrganization)
			: null
	}

	/**
	 * Deletes an organization by ID (logical deletion by setting 'deletedAt').
	 * @param {string} id - The ID of the organization to delete.
	 * @returns {Promise<boolean>} True if the organization was marked as deleted, false otherwise.
	 */
	async delete(id: string): Promise<boolean> {
		const organization = await this.db.organization.update({
			where: { id },
			data: { deletedAt: new Date() },
			select: { id: true }
		})
		return !!organization
	}

	/**
	 * Find all non-deleted organizations.
	 * @returns {Promise<Organization[]>} An array of organization entities.
	 */
	async findAll(): Promise<Organization[]> {
		const prismaOrganizations = await this.db.organization.findMany({
			where: {
				deletedAt: null
			}
		})
		return prismaOrganizations.map(this.mapPrismaOrganizationToDomain)
	}

	/**
	 * Finds an organization by name.
	 * @param {string} name - The unique name of the organization.
	 * @returns {Promise<Organization | null>} The organization entity or null if not found.
	 */
	async findByName(name: string): Promise<Organization | null> {
		const prismaOrganization = await this.db.organization.findFirst({
			where: {
				name,
				deletedAt: null
			}
		})
		return prismaOrganization
			? this.mapPrismaOrganizationToDomain(prismaOrganization)
			: null
	}
}
