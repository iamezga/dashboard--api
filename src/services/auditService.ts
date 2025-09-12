import { AuditAction, AuditInput } from '@/modules/audit/entities/Audit'
import { AuditRepositoryInterface } from '@/modules/audit/entities/AuditRepositoryInterface'
import { JobInterface } from '@/types/job/JobInterface'
import * as Sentry from '@sentry/node'

export class AuditService {
	public readonly name = 'AuditService'

	/**
	 * @param {AuditRepositoryInterface} auditRepository - The repository for audit logs.
	 */
	constructor(private readonly auditRepository: AuditRepositoryInterface) {}

	/**
	 * @description Records a new audit event.
	 * @param {AuditAction} action - The type of action to record.
	 * @param {JobInterface} job - The job object with request and user context.
	 * @param {string} resourceType - The type of the resource being audited.
	 * @param {string} resourceId - The ID of the resource.
	 * @param {unknown} [payload] - Optional payload with additional data (e.g., old and new values).
	 * @returns {Promise<void>}
	 */
	public async record(
		action: AuditAction,
		job: JobInterface,
		resourceType: string,
		resourceId: string,
		payload?: Record<string, any>
	): Promise<void> {
		let auditData = {} as AuditInput
		try {
			const { ip } = job.getMeta()
			const user = job.getPublicUser()

			if (!user) return

			auditData = {
				action,
				jobId: job.getId(),
				timestamp: new Date(),
				user: {
					userId: user.id,
					userEmail: user.email,
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
		} catch (error) {
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
