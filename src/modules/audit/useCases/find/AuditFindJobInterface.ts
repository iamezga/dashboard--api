import { JobInterface } from '@/types/job/JobInterface'

export interface AuditFindJobInterface extends JobInterface {
	getData(): {
		id?: string
		action?: string
		jobId?: string
		userId?: string
		userEmail?: string
		organizationId?: string
		resourceType?: string
		resourceId?: string
		ip?: string
		startDate?: string
		endDate?: string
		page?: number
		limit?: number
		sortBy?: string
		sortOrder?: 'asc' | 'desc'
	}
}
