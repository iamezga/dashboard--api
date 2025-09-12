/**
 * @description The specific actions that can be audited.
 */
export type AuditAction = 'auth.login'

export interface AuditInput<TPayload = Record<string, any>> {
	action: AuditAction
	jobId: string
	timestamp: Date
	user: {
		userId: string
		userEmail: string
		organizationId: string
		roleId: string
	}
	resource: {
		resourceType: string
		resourceId: string
	}
	payload?: TPayload
	ip?: string
}
export interface Audit<TPayload = Record<string, any>>
	extends AuditInput<TPayload> {
	_id: string
}
