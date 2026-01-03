import { PrismaClient } from '@/generated/prisma/client'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { Logger } from 'pino'
import { AuditInput } from '../entities/Audit'
import { AuditRepositoryInterface } from '../entities/AuditRepositoryInterface'

/**
 * @class PostgresAuditRepository
 * @description Implements AuditRepositoryInterface for PostgreSQL using PrismaClient.
 * Handles audit log persistence for the Postgres implementation.
 *
 * Constructor Injection:
 * - Receives DependencyContainer in constructor
 * - Extracts only needed dependencies (repositoryManager, logger)
 * - 100% ready to use immediately after instantiation
 * - No two-phase initialization required
 */
export class PostgresAuditRepository implements AuditRepositoryInterface {
	static name = 'audit' as const
	static provider = 'postgres' as const
	private prisma: PrismaClient

	private readonly logger: Logger

	/**
	 * Creates a new PostgresAuditRepository instance.
	 *
	 * @param {PrismaClient} prisma - The Prisma client for Postgres
	 * @param {DependencyContainer} container - The dependency container with services and other repositories
	 *
	 * Architecture:
	 * - Extract only required dependencies from container
	 * - Allows flexible dependency changes in future (no breaking changes to constructor)
	 * - Makes dependencies explicit and testable
	 */
	constructor(prisma: PrismaClient, container: DependencyContainer) {
		this.prisma = prisma
		this.logger = container.logger

		this.logger.info(
			`Repository initialized: ${PostgresAuditRepository.name} (Postgres)`
		)
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
			this.logger?.error({ error }, 'Failed to insert audit record (Postgres).')
		}
	}
}
