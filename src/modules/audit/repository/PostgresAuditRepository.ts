import { DependencyContainer } from '@/types/core/dependencyContainer'

import { PrismaClient } from '@/generated/prisma/client'
import { AuditInput } from '../entities/Audit'
import { AuditRepositoryContext } from '../entities/AuditRepositoryContext'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

export class PostgresAuditRepository implements AuditRepositoryInterface {
	static name = 'audit' as const
	static provider = 'postgres' as const
	private prisma: PrismaClient
	private context!: AuditRepositoryContext

	constructor(prisma: PrismaClient) {
		this.prisma = prisma
	}

	setContext(container: DependencyContainer): void {
		const { repositoryManager, logger } = container
		this.context = { repositoryManager, logger }
		this.context.logger.info('PostgresAuditRepository context ready.')
	}

	async insert(auditLog: AuditInput): Promise<void> {
		try {
			await this.prisma.audit.create({
				data: {
					action: auditLog.action,
					jobId: auditLog.jobId,
					timestamp: auditLog.timestamp,
					user: auditLog.user as any,
					resource: auditLog.resource as any,
					payload: auditLog.payload as any,
					ip: auditLog.ip
				}
			})
		} catch (error: any) {
			// Do not throw from audit failures - should not block main flow
			this.context?.logger?.error(
				{ error },
				'Failed to insert audit record (Postgres).'
			)
		}
	}
}
