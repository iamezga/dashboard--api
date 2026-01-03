import { AuditInput } from './Audit'

export interface AuditRepositoryInterface {
	/**
	 * @description Inserts a new audit record.
	 * Repositories use constructor injection to receive dependencies.
	 * They extract only the dependencies they need from the DependencyContainer.
	 * @param {AuditInput} auditLog - The audit log object to be inserted.
	 * @returns {Promise<void>}
	 */
	insert(auditLog: AuditInput): Promise<void>
}
