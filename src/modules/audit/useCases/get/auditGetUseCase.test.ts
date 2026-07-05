import { Logger } from 'pino'
import { vi } from 'vitest'
import { NotFoundError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { JobInterface } from '../../../../types/job/JobInterface'
import { Permission } from '../../../permission/entities/Permission'
import { AuthenticatedUser } from '../../../user/entities/User'
import { Audit } from '../../entities'
import { AuditGetJobInterface } from './AuditGetJobInterface'
import { AuditGetUseCase } from './AuditGetUseCase'

const makeJob = (
	data: any,
	options: {
		attempts?: number
		user?: Partial<AuthenticatedUser>
		publicUser?: boolean
	} = {}
) =>
	({
		getId: () => 'job-id',
		getData: () => data,
		getMeta: () => ({ ip: '127.0.0.1' }),
		getAttempts: () => options.attempts ?? 1,
		getUser: () => ({
			id: 'user-id',
			membership: {
				id: 'membership-id',
				organization: {
					id: 'org-id',
					name: 'Org',
					timezone: 'UTC',
					scope: 'TENANT'
				},
				role: {
					id: 'role-id',
					name: 'admin',
					label: 'Admin',
					scope: 'TENANT'
				},
				permissions: {},
				...((options.user?.membership as object | undefined) || {})
			},
			...options.user
		}),
		getPublicUser: () => options.publicUser ?? true,
		logger: {
			info: vi.fn(),
			warn: vi.fn(),
			error: vi.fn(),
			child: vi.fn().mockReturnThis()
		} as unknown as Logger
	}) as unknown as AuditGetJobInterface & JobInterface & { logger: Logger }

describe('AuditGetUseCase', () => {
	const auditRepo = {
		findById: vi.fn(),
		find: vi.fn(),
		insert: vi.fn()
	}

	const globalLogger = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn(),
		child: vi.fn().mockReturnThis()
	}

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'audit') return auditRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			logger: globalLogger
		}) as unknown as DependencyContainer

	const mockAudit: Audit = {
		_id: 'audit-123',
		action: 'auth.login',
		timestamp: new Date('2026-01-04T10:00:00Z'),
		jobId: 'job-123',
		user: {
			actorType: 'user',
			userId: 'user-456',
			userEmail: 'user@example.com',
			sessionId: 'session-123',
			membershipId: 'membership-123',
			organizationId: 'org-789',
			roleId: 'role-123'
		},
		classification: {
			category: 'security',
			severity: 'info',
			result: { status: 'success' }
		},
		resource: {
			resourceType: 'session',
			resourceId: 'session-123'
		},
		payload: { success: true },
		ip: '192.168.1.1'
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should have a static permission defined', () => {
		expect(AuditGetUseCase.permission).toBe('audit.get')
	})

	it('should build permission validation schema and data correctly', async () => {
		const job = makeJob(
			{ id: 'audit-123' },
			{
				user: {
					membership: {
						id: 'membership-id',
						organization: {
							id: 'org-id',
							name: 'Org',
							timezone: 'UTC',
							scope: 'TENANT'
						},
						role: {
							id: 'role-id',
							name: 'admin',
							label: 'Admin',
							scope: 'TENANT'
						},
						permissions: {
							'audit.get': {} as Permission,
							'audit.find': {} as Permission
						}
					}
				}
			}
		)

		const result = await AuditGetUseCase.getPermissionValidationData(
			job,
			{} as any
		)

		expect(result).toEqual({
			data: { permission: 'audit.get' },
			schema: {
				permission: {
					type: 'enum',
					values: ['audit.get', 'audit.find']
				}
			}
		})
	})

	it('should retrieve an audit record by ID successfully', async () => {
		const container = makeContainer()
		const useCase = new AuditGetUseCase(container)

		auditRepo.findById.mockResolvedValue(mockAudit)

		const job = makeJob({ id: 'audit-123' })

		const result = await useCase.run(job)

		expect(auditRepo.findById).toHaveBeenCalledWith('audit-123')
		expect(result.data).toEqual(mockAudit)
		expect(result.metadata).toHaveProperty('retrievedAt')
		expect(typeof result.metadata?.retrievedAt).toBe('string')
		expect(job.logger.info).toHaveBeenCalledWith(
			{ id: 'audit-123' },
			'Retrieving audit record'
		)
		expect(job.logger.info).toHaveBeenCalledWith(
			{ auditId: 'audit-123' },
			'Audit record retrieved successfully'
		)
	})

	it('should throw NotFoundError when audit record does not exist', async () => {
		const container = makeContainer()
		const useCase = new AuditGetUseCase(container)

		auditRepo.findById.mockResolvedValue(null)

		const job = makeJob({ id: 'nonexistent-id' })

		await expect(useCase.run(job)).rejects.toThrow(NotFoundError)
		await expect(useCase.run(job)).rejects.toThrow(
			"Audit record with ID 'nonexistent-id' not found"
		)

		expect(auditRepo.findById).toHaveBeenCalledWith('nonexistent-id')
		expect(job.logger.info).toHaveBeenCalledWith(
			{ id: 'nonexistent-id' },
			'Retrieving audit record'
		)
	})

	it('should propagate repository errors', async () => {
		const container = makeContainer()
		const useCase = new AuditGetUseCase(container)

		const repositoryError = new Error('Database connection failed')
		auditRepo.findById.mockRejectedValue(repositoryError)

		const job = makeJob({ id: 'audit-123' })

		await expect(useCase.run(job)).rejects.toThrow('Database connection failed')

		expect(auditRepo.findById).toHaveBeenCalledWith('audit-123')
	})
})
