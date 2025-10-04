import { RepositoryManager } from '@/core/repositoryManager'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { Collection } from 'mongodb'
import { Logger } from 'pino'
import { Audit, AuditInput } from '../entities/Audit'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

export type AuditRepositoryContext = {
	repositoryManager: RepositoryManager
	logger: Logger
}

export class AuditRepository implements AuditRepositoryInterface {
	static name = 'audit' as const
	static provider: keyof DatabaseClientsMap = 'mongo'
	private readonly collection: Collection<Audit>
	private context!: AuditRepositoryContext
	public readonly db: DatabaseClientsMap['mongo']
	public readonly name = 'AuditRepository'

	constructor(db: DatabaseClientsMap['mongo']) {
		this.db = db
		this.collection = db.collection<Audit>('audits')
	}

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
	 * @description Inserts a new audit record into the database.
	 * @param {AuditInput} data - The audit input object to be inserted.
	 * @returns {Promise<void>}
	 */
	public async insert(data: AuditInput): Promise<void> {
		try {
			await this.collection.insertOne(data as any)
		} catch (error) {
			// It's crucial not to throw an error here. A failed audit log should not block the main user action.
			this.context.logger.error({ error }, 'Failed to insert audit record.')
		}
	}
}
