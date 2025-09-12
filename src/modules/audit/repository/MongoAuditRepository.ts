import { DatabaseClients } from '@/services/databaseServiceManager'
import logger from '@/services/logger'
import { Collection } from 'mongodb'
import { Audit, AuditInput } from '../entities/Audit'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

export class MongoAuditRepository implements AuditRepositoryInterface {
	public readonly db: DatabaseClients['mongo']
	public readonly name = 'AuditRepository'
	private readonly collection: Collection<Audit>

	constructor(db: DatabaseClients['mongo']) {
		this.db = db
		this.collection = db.collection<Audit>('audits')
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
			logger.error({ error }, 'Failed to insert audit record.')
		}
	}
}
