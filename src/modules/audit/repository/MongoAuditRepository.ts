import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import {
	NormalizedPaginationInput,
	PaginatedResponse
} from '@/types/pagination'
import { buildPaginationMeta } from '@/utils/pagination'
import { Collection, Filter } from 'mongodb'
import { Logger } from 'pino'
import { Audit, AuditInput } from '../entities/Audit'
import { AuditFilters } from '../entities/AuditFilters'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

/**
 * @class MongoAuditRepository
 * @description Implements AuditRepositoryInterface for MongoDB.
 * Handles audit log persistence for the Mongo implementation.
 *
 * Constructor Injection:
 * - Receives DependencyContainer in constructor
 * - Extracts only needed dependencies (repositoryManager, logger)
 * - 100% ready to use immediately after instantiation
 * - No two-phase initialization required
 */
export class MongoAuditRepository implements AuditRepositoryInterface {
	static name = 'audit' as const
	static provider: keyof DatabaseClientsMap = 'mongo'
	private readonly collection: Collection<Audit>
	public readonly db: DatabaseClientsMap['mongo']

	private readonly logger: Logger

	/**
	 * Creates a new MongoAuditRepository instance.
	 *
	 * @param {DatabaseClientsMap['mongo']} db - The MongoDB client for audit logs
	 * @param {DependencyContainer} container - The dependency container with services and other repositories
	 *
	 * Architecture:
	 * - Extract only required dependencies from container
	 * - Allows flexible dependency changes in future (no breaking changes to constructor)
	 * - Makes dependencies explicit and testable
	 */
	constructor(db: DatabaseClientsMap['mongo'], container: DependencyContainer) {
		this.db = db
		this.collection = db.collection<Audit>('audits')
		this.logger = container.logger

		this.logger.info(
			`Repository initialized: ${MongoAuditRepository.name} (Mongo)`
		)
	}

	/**
	 * @description Inserts a new audit record into the database.
	 * @param {AuditInput} data - The audit input object to be inserted.
	 * @returns {Promise<void>}
	 */
	public async insert(data: AuditInput): Promise<void> {
		try {
			await this.collection.insertOne(data as any)
		} catch (error: any) {
			// It's crucial not to throw an error here. A failed audit log should not block the main user action.
			this.logger.error({ error }, 'Failed to insert audit record (Mongo).')
		}
	}

	async findById(id: string): Promise<Audit | null> {
		try {
			const record = await this.collection.findOne({ _id: id } as any)
			return record || null
		} catch (error: any) {
			this.logger?.error(
				{ error, id },
				'Failed to find audit record by ID (Mongo).'
			)
			return null
		}
	}

	async find(
		filters: AuditFilters,
		pagination: NormalizedPaginationInput
	): Promise<PaginatedResponse<Audit>> {
		try {
			// Build MongoDB filter from AuditFilters
			const query: Filter<Audit> = {}

			if (filters.id) query._id = filters.id as any
			if (filters.action) query.action = filters.action as any
			if (filters.jobId) query.jobId = filters.jobId
			if (filters.ip) query.ip = filters.ip

			// Nested user fields
			if (filters.userId) query['user.userId'] = filters.userId
			if (filters.userEmail) query['user.userEmail'] = filters.userEmail
			if (filters.organizationId) {
				query['user.organizationId'] = filters.organizationId
			}

			// Nested resource fields
			if (filters.resourceType) {
				query['resource.resourceType'] = filters.resourceType
			}
			if (filters.resourceId) query['resource.resourceId'] = filters.resourceId

			// Date range filtering
			if (filters.startDate || filters.endDate) {
				query.timestamp = {}
				if (filters.startDate) {
					;(query.timestamp as any).$gte = filters.startDate
				}
				if (filters.endDate) {
					;(query.timestamp as any).$lte = filters.endDate
				}
			}

			// Get total count for pagination
			const totalItems = await this.collection.countDocuments(query)

			// Get paginated records
			const records = await this.collection
				.find(query)
				.skip(pagination.skip)
				.limit(pagination.limit)
				.sort({ [pagination.sortBy]: pagination.sortOrder === 'asc' ? 1 : -1 })
				.toArray()

			return {
				items: records as Audit[],
				pagination: buildPaginationMeta(
					totalItems,
					pagination.page,
					pagination.limit
				)
			}
		} catch (error: any) {
			this.logger?.error(
				{ error, filters, pagination },
				'Failed to find audit records (Mongo).'
			)
			// Return empty result on error
			return {
				items: [],
				pagination: buildPaginationMeta(0, pagination.page, pagination.limit)
			}
		}
	}
}
