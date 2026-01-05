import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { normalizePagination } from '@/utils/pagination'
import { Audit, AuditFilters } from '../../entities'
import { AuditFindJobInterface } from './AuditFindJobInterface'

/**
 * @class AuditFindUseCase
 * @description Searches and retrieves audit logs with advanced filtering and pagination.
 *
 * Use Case Flow:
 * 1. Extract filter criteria from request data
 * 2. Validate user has 'audit.find' permission
 * 3. Normalize pagination parameters (page, limit, sortBy, sortOrder)
 * 4. Query audit repository with filters and pagination
 * 5. Return audit records with pagination metadata
 *
 * Supported Filters:
 * - id: Audit record ID
 * - action: Action type (create, update, delete, login, etc.)
 * - jobId: Associated job identifier
 * - userId: User who performed the action
 * - userEmail: Email of user who performed the action
 * - organizationId: Organization context
 * - resourceType: Type of resource affected (User, Role, etc.)
 * - resourceId: ID of affected resource
 * - ip: IP address of request
 * - startDate/endDate: Date range filter
 *
 * @permission audit.find
 */
export class AuditFindUseCase extends UseCase<AuditFindJobInterface> {
	static readonly permission: string = 'audit.find'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `audit.find` permission check.
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		return this.buildPermissionSchema(this.permission, job)
	}

	/**
	 * Executes the business logic for finding audit records.
	 * @param {AuditFindJobInterface} job - The Job object containing filter criteria and pagination options.
	 * @returns {Promise<UseCaseResponseInterface<Audit[]>>} A promise that resolves to an array of audit records with metadata.
	 */
	async run(
		job: AuditFindJobInterface
	): Promise<UseCaseResponseInterface<Audit[]>> {
		const data = job.getData()

		job.logger.info({ filters: data }, 'Finding audit records')

		const filters: AuditFilters = {
			id: data.id,
			action: data.action,
			jobId: data.jobId,
			userId: data.userId,
			userEmail: data.userEmail,
			organizationId: data.organizationId,
			resourceType: data.resourceType,
			resourceId: data.resourceId,
			ip: data.ip,
			startDate: data.startDate ? new Date(data.startDate) : undefined,
			endDate: data.endDate ? new Date(data.endDate) : undefined
		}

		const pagination = normalizePagination(
			{
				page: data.page,
				limit: data.limit,
				sortBy: data.sortBy,
				sortOrder: data.sortOrder
			},
			'createdAt'
		)

		const auditRepository = this.container.repositoryManager.get('audit')
		const result = await auditRepository.find(filters, pagination)

		job.logger.info(
			{
				totalItems: result.pagination.totalItems,
				currentPage: result.pagination.currentPage,
				itemsReturned: result.items.length
			},
			'Audit records retrieved successfully'
		)

		return {
			data: result.items,
			metadata: {
				queriedAt: new Date().toISOString(),
				appliedFilters: Object.keys(filters).filter(
					key => filters[key as keyof AuditFilters] !== undefined
				),
				pagination: result.pagination
			}
		}
	}
}
