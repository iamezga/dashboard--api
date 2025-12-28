import { AuditAction } from '@/modules/audit/entities/Audit'
import { JobInterface } from '@/types/job/JobInterface'

export class NoOpAuditService {
	public readonly name = 'NoOpAuditService'

	public async record(
		_action: AuditAction,
		_job: JobInterface,
		_resourceType: string,
		_resourceId: string,
		_payload?: Record<string, any>
	): Promise<void> {
		// Intentionally do nothing. Keeps API compatible when audit provider is disabled.
		return
	}
}

export default NoOpAuditService
