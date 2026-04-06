import {
	AuditAction,
	AuditCategory,
	AuditResultStatus,
	AuditSeverity
} from './AuditCatalog'

export type {
	AuditAction,
	AuditCategory,
	AuditResultStatus,
	AuditSeverity
} from './AuditCatalog'

export interface AuditUserContext {
	actorType: 'user' | 'anonymous' | 'system'
	userId: string
	userEmail: string
	sessionId?: string
	membershipId?: string
	organizationId?: string
	roleId?: string
}

export interface AuditResult {
	status: AuditResultStatus
	errorCode?: string
	message?: string
}

export interface AuditClassification {
	category: AuditCategory
	severity: AuditSeverity
	result: AuditResult
	tags?: string[]
}

export interface AuditInput<TPayload = Record<string, any>> {
	action: AuditAction
	jobId: string
	timestamp: Date
	classification: AuditClassification
	user: AuditUserContext
	resource: {
		resourceType: string
		resourceId: string
	}
	payload?: TPayload
	ip?: string
}
export interface Audit<
	TPayload = Record<string, any>
> extends AuditInput<TPayload> {
	_id: string
}
