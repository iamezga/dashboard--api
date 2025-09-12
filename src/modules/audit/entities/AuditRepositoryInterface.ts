import { DatabaseClients } from '@/services/databaseServiceManager'
import { AuditInput } from './Audit'

export interface AuditRepositoryInterface {
	readonly db: DatabaseClients['mongo']
	readonly name: 'AuditRepository'
	/**
	 * @description Inserts a new audit record.
	 * @param {AuditInput} auditLog - The audit log object to be inserted.
	 * @returns {Promise<void>}
	 */
	insert(auditLog: AuditInput): Promise<void>
}
