import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { normalizePagination } from '@/utils/pagination'
import { Audit, AuditFilters } from '../../entities'
import { AuditFindJobInterface } from './AuditFindJobInterface'

export class AuditFindUseCase extends UseCase<AuditFindJobInterface> {
	static readonly permission: string = 'audit.find'

	constructor(container: DependencyContainer) {
		super(container)
	}

	static async getPermissionValidationData(
		job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		return this.buildPermissionSchema(this.permission, job)
	}

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
