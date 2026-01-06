import { Prisma } from '@/generated/prisma/client'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { OrganizationMapper } from '@/utils/mappers'
import { Logger } from 'pino'
import {
	Organization,
	OrganizationCreateInput,
	OrganizationUpdateInput
} from '../entities/Organization'
import { OrganizationRepositoryInterface } from '../entities/OrganizationRepositoryInterface'

/**
 * @class OrganizationRepository
 * @description Implements OrganizationRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles mapping between domain entities and Prisma models for organizations.
 *
 * Constructor Injection:
 * - Receives DependencyContainer in constructor
 * - Extracts only needed dependencies (repositoryManager, logger)
 * - 100% ready to use immediately after instantiation
 * - No two-phase initialization required
 */
export class OrganizationRepository implements OrganizationRepositoryInterface {
	static name = 'organization' as const
	static provider: keyof DatabaseClientsMap = 'postgres'
	private organizationMapper = new OrganizationMapper()

	private readonly logger: Logger

	/**
	 * Creates a new OrganizationRepository instance.
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
		this.logger = container.logger

		this.logger.info(`Repository initialized: ${OrganizationRepository.name}`)
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
		return this.organizationMapper.mapOrNull(prismaOrganization)
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
		return this.organizationMapper.mapToDomain(prismaOrganization)
	}

	/**
	 * Updates an existing organization.
	 * @param {string} id - The ID of the organization to update.
	 * @param {OrganizationUpdateInput} data - The partial data to update.
	 * @returns {Promise<Organization>} The updated organization entity.
	 * @throws {Error} If the organization is not found (Prisma throws PrismaClientKnownRequestError with code P2025).
	 */
	async update(
		id: string,
		data: OrganizationUpdateInput
	): Promise<Organization> {
		const prismaOrganization = await this.db.organization.update({
			where: { id },
			data: data as Prisma.OrganizationUpdateInput
		})
		return this.organizationMapper.mapToDomain(prismaOrganization)
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
		return this.organizationMapper.mapArrayToDomain(prismaOrganizations)
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
		return this.organizationMapper.mapOrNull(prismaOrganization)
	}

	/**
	 * Finds an organization by its unique slug.
	 * Slugs are used for subdomain routing and URL identification.
	 * @param {string} slug - The unique slug of the organization (e.g., 'acme', 'innovatech').
	 * @returns {Promise<Organization | null>} The organization entity or null if not found.
	 */
	async findBySlug(slug: string): Promise<Organization | null> {
		const prismaOrganization = await this.db.organization.findUnique({
			where: {
				slug
			}
		})
		return this.organizationMapper.mapOrNull(prismaOrganization)
	}
}
