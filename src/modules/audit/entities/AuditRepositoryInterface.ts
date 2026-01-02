import { DependencyContainer } from '@/types/core/dependencyContainer'
import { AuditInput } from './Audit'

export interface AuditRepositoryInterface {
	/**
	 * @description Inserts a new audit record.
	 * @param {AuditInput} auditLog - The audit log object to be inserted.
	 * @returns {Promise<void>}
	 */
	insert(auditLog: AuditInput): Promise<void>

	/**
	 * @description Sets the context for the repository instance.
	 * This allows the repository to access other services or repositories from the container.
	 * @param {DependencyContainer} container - The main dependency container.
	 */
	setContext(container: DependencyContainer): void
}
