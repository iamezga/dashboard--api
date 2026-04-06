/**
 * @interface AuditFilters
 * @description Filters for querying audit records.
 * All fields are optional to allow flexible filtering.
 *
 * @example
 * ```typescript
 * const filters: AuditFilters = {
 *   action: 'auth.login',
 *   userId: 'user-123',
 *   startDate: new Date('2026-01-01'),
 *   endDate: new Date('2026-01-31')
 * }
 * ```
 */
export interface AuditFilters {
	/**
	 * Filter by category.
	 * @example 'security', 'operational', 'compliance'
	 */
	category?: string

	/**
	 * Filter by severity.
	 * @example 'info', 'warning', 'critical'
	 */
	severity?: string

	/**
	 * Filter by result status.
	 * @example 'success', 'failed', 'denied'
	 */
	resultStatus?: string

	/**
	 * Filter by audit ID (exact match).
	 * Useful when searching for a specific audit record.
	 */
	id?: string

	/**
	 * Filter by action type.
	 * @example 'auth.login', 'user.create'
	 */
	action?: string

	/**
	 * Filter by job ID.
	 * Useful for tracking all audit entries related to a specific job/request.
	 */
	jobId?: string

	/**
	 * Filter by user ID.
	 * Shows all actions performed by a specific user.
	 */
	userId?: string

	/**
	 * Filter by user email.
	 * Alternative to userId when email is more convenient.
	 */
	userEmail?: string

	/**
	 * Filter by session ID.
	 * Useful for reconstructing actions taken in a specific login session.
	 */
	sessionId?: string

	/**
	 * Filter by membership ID.
	 * Useful when the same user can act under different memberships.
	 */
	membershipId?: string

	/**
	 * Filter by organization ID.
	 * Shows all actions within a specific organization.
	 */
	organizationId?: string

	/**
	 * Filter by role ID.
	 * Useful for inspecting actions executed under a specific role.
	 */
	roleId?: string

	/**
	 * Filter by actor type.
	 * @example 'user', 'anonymous', 'system'
	 */
	actorType?: string

	/**
	 * Filter by resource type.
	 * @example 'user', 'organization', 'permission'
	 */
	resourceType?: string

	/**
	 * Filter by resource ID.
	 * Shows all actions on a specific resource.
	 */
	resourceId?: string

	/**
	 * Filter by IP address.
	 * Useful for security audits.
	 */
	ip?: string

	/**
	 * Filter by start date (inclusive).
	 * Shows records from this date forward.
	 */
	startDate?: Date

	/**
	 * Filter by end date (inclusive).
	 * Shows records up to this date.
	 */
	endDate?: Date
}
