import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { Collection } from 'mongodb'
import { Logger } from 'pino'
import { Audit, AuditInput } from '../entities/Audit'
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
}
