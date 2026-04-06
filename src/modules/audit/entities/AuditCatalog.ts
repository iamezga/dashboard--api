export const AUDIT_ACTIONS = [
	// Auth
	'auth.login',
	'auth.login.success',
	'auth.login.failed',
	'auth.logout.success',
	'auth.password_recovery.requested',
	'auth.password_reset.success',

	// Membership / Access
	'membership.selected',
	'membership.role_changed',
	'permission.override.applied',
	'permission.override.removed',

	// User
	'user.created',
	'user.updated',
	'user.status_changed',
	'user.deleted',

	// Generic resource actions
	'resource.created',
	'resource.updated',
	'resource.deleted',
	'resource.viewed',

	// Security
	'security.forbidden_access',
	'security.rate_limit.triggered',
	'security.suspicious_pattern.detected'
] as const

export type KnownAuditAction = (typeof AUDIT_ACTIONS)[number]

// Allows future module actions without forcing edits in this central file.
export type CustomAuditAction = `${string}.${string}`

export type AuditAction = KnownAuditAction | CustomAuditAction

export type AuditCategory = 'security' | 'operational' | 'compliance'
export type AuditSeverity = 'info' | 'warning' | 'critical'
export type AuditResultStatus = 'success' | 'failed' | 'denied'
