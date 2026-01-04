import {
	NormalizedPaginationInput,
	PaginatedResponse
} from '@/types/pagination'
import { Audit, AuditInput } from './Audit'
import { AuditFilters } from './AuditFilters'

export interface AuditRepositoryInterface {
	/**
	 * @description Inserts a new audit record.
	 * Repositories use constructor injection to receive dependencies.
	 * They extract only the dependencies they need from the DependencyContainer.
	 * @param {AuditInput} auditLog - The audit log object to be inserted.
	 * @returns {Promise<void>}
	 */
	insert(auditLog: AuditInput): Promise<void>

	/**
	 * @description Finds a single audit record by ID.
	 * @param {string} id - The unique identifier of the audit record.
	 * @returns {Promise<Audit | null>} The audit record if found, null otherwise.
	 */
	findById(id: string): Promise<Audit | null>

	/**
	 * @description Finds audit records with optional filters and pagination.
	 * @param {AuditFilters} filters - Optional filters to apply to the query.
	 * @param {NormalizedPaginationInput} pagination - Pagination parameters (page, limit, sort).
	 * @returns {Promise<PaginatedResponse<Audit>>} Paginated list of audit records.
	 */
	find(
		filters: AuditFilters,
		pagination: NormalizedPaginationInput
	): Promise<PaginatedResponse<Audit>>
}
