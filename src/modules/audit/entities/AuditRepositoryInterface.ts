import { AuditInput } from './Audit'

export interface AuditRepositoryInterface {
	/**
	 * @description Inserts a new audit record.
	 * @param {AuditInput} auditLog - The audit log object to be inserted.
	 * @returns {Promise<void>}
	 */
	insert(auditLog: AuditInput): Promise<void>
}
