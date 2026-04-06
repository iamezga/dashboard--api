import {
	AuditAction,
	AuditClassification,
	AuditInput,
	AuditUserContext
} from '@/modules/audit/entities/Audit'
import { AuditRepositoryInterface } from '@/modules/audit/entities/AuditRepositoryInterface'
import { JobInterface } from '@/types/job/JobInterface'
import * as Sentry from '@sentry/node'

type AuditRecordOptions = Partial<AuditClassification>

export class AuditService {
	/**
	 * Creates a new instance of the AuditService.
	 * @param {AuditRepositoryInterface} auditRepository - The repository for audit logs.
	 */
	constructor(private readonly auditRepository: AuditRepositoryInterface) {}

	private resolveActorType(
		hasUserIdentity: boolean,
		meta: ReturnType<JobInterface['getMeta']>
	): 'user' | 'anonymous' | 'system' {
		if (hasUserIdentity) return 'user'

		const isSystemSource =
			meta.initiatedBy === 'system' ||
			meta.executionSource === 'worker' ||
			meta.executionSource === 'scheduler' ||
			meta.executionSource === 'system'

		if (isSystemSource) return 'system'

		return 'anonymous'
	}

	/**
	 * Builds the audit user context from the job object.
	 * @param {JobInterface} job - The job object containing user and request context.
	 * @returns {Partial<AuditUserContext>} The partial audit user context.
	 */
	private buildAuditUserContext(job: JobInterface): Partial<AuditUserContext> {
		const meta = job.getMeta()
		let authenticatedUser: ReturnType<JobInterface['getUser']> | undefined

		try {
			authenticatedUser = job.getUser()
		} catch {
			authenticatedUser = undefined
		}

		const publicUser = job.getPublicUser()
		const activeMembership = authenticatedUser?.membership
		const hasUserIdentity =
			Boolean(authenticatedUser?.id) || Boolean(publicUser?.id)
		const actorType = this.resolveActorType(hasUserIdentity, meta)

		return {
			actorType,
			userId: authenticatedUser?.id ?? publicUser?.id,
			userEmail: authenticatedUser?.email ?? publicUser?.email,
			sessionId: meta.sessionId,
			membershipId: activeMembership?.id,
			organizationId: activeMembership?.organization?.id,
			roleId: activeMembership?.role?.id
		}
	}

	/**
	 * Provides default classification for an audit event based on the action type.
	 * Security-related actions are classified under the 'security' category, while all other
	 * actions default to 'operational'. The severity is set to 'info' and the result status
	 * is set to 'success' by default. This method ensures that all audit events have a
	 * baseline classification, which can be overridden by specific options when recording an event.
	 *
	 * @param {AuditAction} action - The action for which to determine the default classification.
	 * @returns {AuditClassification} The default classification for the given action.
	 */
	private getDefaultClassification(action: AuditAction): AuditClassification {
		const isSecurityAction =
			action.startsWith('auth.') || action.startsWith('security.')

		return {
			category: isSecurityAction ? 'security' : 'operational',
			severity: 'info',
			result: { status: 'success' },
			tags: []
		}
	}

	/**
	 * @description Records a new audit event.
	 * @param {AuditAction} action - The type of action to record.
	 * @param {JobInterface} job - The job object with request and user context.
	 * @param {string} resourceType - The type of the resource being audited.
	 * @param {string} resourceId - The ID of the resource.
	 * @param {unknown} [payload] - Optional payload with additional data (e.g., old and new values).
	 * @param {Partial<AuditUserContext>} [userOverrides] - Explicit actor context for public or pre-auth flows.
	 * @param {AuditRecordOptions} [options] - Optional classification overrides (category, severity, result, tags).
	 * @returns {Promise<void>}
	 */
	public async record(
		action: AuditAction,
		job: JobInterface,
		resourceType: string,
		resourceId: string,
		payload?: Record<string, any>,
		userOverrides?: Partial<AuditUserContext>,
		options?: AuditRecordOptions
	): Promise<void> {
		let auditData = {} as AuditInput
		try {
			const { ip } = job.getMeta()
			const user = {
				...this.buildAuditUserContext(job),
				...userOverrides
			}
			const defaults = this.getDefaultClassification(action)
			const classification: AuditClassification = {
				category: options?.category ?? defaults.category,
				severity: options?.severity ?? defaults.severity,
				result: options?.result ?? defaults.result,
				tags: options?.tags ?? defaults.tags
			}

			if (!user.actorType) user.actorType = 'anonymous'

			const fallbackUserIdentity =
				user.actorType === 'system'
					? {
							userId: 'system',
							userEmail: 'system@local'
						}
					: {
							userId: 'anonymous',
							userEmail: 'anonymous@local'
						}

			auditData = {
				action,
				jobId: job.getId(),
				timestamp: new Date(),
				classification,
				user: {
					actorType: user.actorType,
					userId: user.userId || fallbackUserIdentity.userId,
					userEmail: user.userEmail || fallbackUserIdentity.userEmail,
					sessionId: user.sessionId,
					membershipId: user.membershipId,
					organizationId: user.organizationId,
					roleId: user.roleId
				},
				resource: {
					resourceType,
					resourceId
				},
				payload,
				ip
			}

			await this.auditRepository.insert(auditData)
		} catch (error: any) {
			// Log the error but do not throw, as audit logs should not block a user action.
			job.logger.error({ error }, 'Failed to record audit event.')
			Sentry.captureException(error, {
				tags: {
					component: 'AuditService',
					action: 'record'
				},
				extra: {
					auditData
				}
			})
		}
	}
}
