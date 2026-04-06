import { JobInterface } from '@/types/job/JobInterface'

export interface AuditFindJobInterface extends JobInterface {
	getData(): {
		category?: string
		severity?: string
		resultStatus?: string
		id?: string
		action?: string
		jobId?: string
		userId?: string
		userEmail?: string
		actorType?: string
		sessionId?: string
		membershipId?: string
		organizationId?: string
		roleId?: string
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
