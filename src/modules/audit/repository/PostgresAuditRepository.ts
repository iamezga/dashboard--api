import { PrismaClient } from '@/generated/prisma/client'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import {
	NormalizedPaginationInput,
	PaginatedResponse
} from '@/types/pagination'
import { buildPaginationMeta } from '@/utils/pagination'
import { Logger } from 'pino'
import { Audit, AuditInput } from '../entities/Audit'
import { AuditFilters } from '../entities/AuditFilters'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

/**
 * @class PostgresAuditRepository
 * @description Implements AuditRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles audit log persistence for the Postgres implementation.
 *
 * Constructor Injection:
 * - Receives DependencyContainer in constructor
 * - Extracts only needed dependencies (repositoryManager, logger)
 * - 100% ready to use immediately after instantiation
 * - No two-phase initialization required
 */
export class PostgresAuditRepository implements AuditRepositoryInterface {
	static name = 'audit' as const
	static provider = 'postgres' as const
	private prisma: PrismaClient

	private readonly logger: Logger

	/**
	 * Creates a new PostgresAuditRepository instance.
	 *
	 * @param {PrismaClient} prisma - The Prisma client for Postgres
	 * @param {DependencyContainer} container - The dependency container with services and other repositories
	 *
	 * Architecture:
	 * - Extract only required dependencies from container
	 * - Allows flexible dependency changes in future (no breaking changes to constructor)
	 * - Makes dependencies explicit and testable
	 */
	constructor(prisma: PrismaClient, container: DependencyContainer) {
		this.prisma = prisma
		this.logger = container.logger

		this.logger.info(
			`Repository initialized: ${PostgresAuditRepository.name} (Postgres)`
		)
	}

	async insert(auditLog: AuditInput): Promise<void> {
		try {
			await this.prisma.audit.create({
				data: {
					action: auditLog.action,
					jobId: auditLog.jobId,
					timestamp: auditLog.timestamp,
					user: auditLog.user as any,
					resource: auditLog.resource as any,
					payload: auditLog.payload as any,
					ip: auditLog.ip
				}
			})
		} catch (error: any) {
			// Do not throw from audit failures - should not block main flow
			this.logger?.error({ error }, 'Failed to insert audit record (Postgres).')
		}
	}

	async findById(id: string): Promise<Audit | null> {
		try {
			const record = await this.prisma.audit.findUnique({
				where: { id }
			})

			if (!record) return null

			return {
				_id: record.id,
				action: record.action as any,
				jobId: record.jobId,
				timestamp: record.timestamp,
				user: record.user as any,
				resource: record.resource as any,
				payload: record.payload as any,
				ip: record.ip || undefined
			}
		} catch (error: any) {
			this.logger?.error(
				{ error, id },
				'Failed to find audit record by ID (Postgres).'
			)
			return null
		}
	}

	async find(
		filters: AuditFilters,
		pagination: NormalizedPaginationInput
	): Promise<PaginatedResponse<Audit>> {
		try {
			// Build where clause from filters
			const where: any = {}

			if (filters.id) where.id = filters.id
			if (filters.action) where.action = filters.action
			if (filters.jobId) where.jobId = filters.jobId
			if (filters.ip) where.ip = filters.ip

			// JSON path filtering for nested user fields
			if (filters.userId) {
				where.user = { path: ['userId'], equals: filters.userId }
			}
			if (filters.userEmail) {
				where.user = { path: ['userEmail'], equals: filters.userEmail }
			}
			if (filters.organizationId) {
				where.user = {
					path: ['organizationId'],
					equals: filters.organizationId
				}
			}

			// JSON path filtering for nested resource fields
			if (filters.resourceType) {
				where.resource = {
					path: ['resourceType'],
					equals: filters.resourceType
				}
			}
			if (filters.resourceId) {
				where.resource = { path: ['resourceId'], equals: filters.resourceId }
			}

			// Date range filtering
			if (filters.startDate || filters.endDate) {
				where.timestamp = {}
				if (filters.startDate) {
					where.timestamp.gte = filters.startDate
				}
				if (filters.endDate) {
					where.timestamp.lte = filters.endDate
				}
			}

			// Get total count for pagination
			const totalItems = await this.prisma.audit.count({ where })

			// Get paginated records
			const records = await this.prisma.audit.findMany({
				where,
				skip: pagination.skip,
				take: pagination.limit,
				orderBy: {
					[pagination.sortBy]: pagination.sortOrder
				}
			})

			// Map to Audit type
			const items: Audit[] = records.map(record => ({
				_id: record.id,
				action: record.action as any,
				jobId: record.jobId,
				timestamp: record.timestamp,
				user: record.user as any,
				resource: record.resource as any,
				payload: record.payload as any,
				ip: record.ip || undefined
			}))

			return {
				items,
				pagination: buildPaginationMeta(
					totalItems,
					pagination.page,
					pagination.limit
				)
			}
		} catch (error: any) {
			this.logger?.error(
				{ error, filters, pagination },
				'Failed to find audit records (Postgres).'
			)
			// Return empty result on error
			return {
				items: [],
				pagination: buildPaginationMeta(0, pagination.page, pagination.limit)
			}
		}
	}
}
