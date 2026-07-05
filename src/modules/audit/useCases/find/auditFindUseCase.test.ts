import { Logger } from 'pino'
import { vi } from 'vitest'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { JobInterface } from '../../../../types/job/JobInterface'
import { PaginatedResponse } from '../../../../types/pagination'
import { Permission } from '../../../permission/entities/Permission'
import { AuthenticatedUser } from '../../../user/entities/User'
import { Audit } from '../../entities'
import { AuditFindJobInterface } from './AuditFindJobInterface'
import { AuditFindUseCase } from './AuditFindUseCase'

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
	}) as unknown as AuditFindJobInterface & JobInterface & { logger: Logger }

describe('AuditFindUseCase', () => {
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

	const mockAudit1: Audit = {
		_id: 'audit-1',
		action: 'auth.login',
		timestamp: new Date('2026-01-04T10:00:00Z'),
		jobId: 'job-1',
		classification: {
			category: 'security',
			severity: 'info',
			result: { status: 'success' }
		},
		user: {
			actorType: 'user',
			userId: 'user-1',
			userEmail: 'user1@example.com',
			sessionId: 'session-1',
			membershipId: 'membership-1',
			organizationId: 'org-1',
			roleId: 'role-1'
		},
		resource: {
			resourceType: 'session',
			resourceId: 'session-1'
		},
		payload: { success: true },
		ip: '192.168.1.1'
	}

	const mockAudit2: Audit = {
		_id: 'audit-2',
		action: 'auth.login',
		timestamp: new Date('2026-01-04T11:00:00Z'),
		jobId: 'job-2',
		classification: {
			category: 'security',
			severity: 'info',
			result: { status: 'success' }
		},
		user: {
			actorType: 'user',
			userId: 'user-1',
			userEmail: 'user1@example.com',
			sessionId: 'session-2',
			membershipId: 'membership-1',
			organizationId: 'org-1',
			roleId: 'role-1'
		},
		resource: {
			resourceType: 'session',
			resourceId: 'session-2'
		},
		payload: {},
		ip: '192.168.1.1'
	}

	const mockAudit3: Audit = {
		_id: 'audit-3',
		action: 'auth.login',
		timestamp: new Date('2026-01-04T12:00:00Z'),
		jobId: 'job-3',
		classification: {
			category: 'security',
			severity: 'warning',
			result: { status: 'failed' }
		},
		user: {
			actorType: 'user',
			userId: 'user-2',
			userEmail: 'user2@example.com',
			sessionId: 'session-3',
			membershipId: 'membership-2',
			organizationId: 'org-2',
			roleId: 'role-2'
		},
		resource: {
			resourceType: 'session',
			resourceId: 'session-3'
		},
		payload: { userEmail: 'newuser@example.com' },
		ip: '192.168.1.2'
	}

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should have a static permission defined', () => {
		expect(AuditFindUseCase.permission).toBe('audit.find')
	})

	it('should build permission validation schema and data correctly', async () => {
		const job = makeJob(
			{},
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

		const result = await AuditFindUseCase.getPermissionValidationData(
			job,
			{} as any
		)

		expect(result).toEqual({
			data: { permission: 'audit.find' },
			schema: {
				permission: {
					type: 'enum',
					values: ['audit.get', 'audit.find']
				}
			}
		})
	})

	it('should retrieve audit records with default pagination', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [mockAudit1, mockAudit2],
			pagination: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 2,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({})

		const result = await useCase.run(job)

		expect(auditRepo.find).toHaveBeenCalledWith(
			{
				category: undefined,
				severity: undefined,
				resultStatus: undefined,
				id: undefined,
				action: undefined,
				jobId: undefined,
				userId: undefined,
				userEmail: undefined,
				actorType: undefined,
				sessionId: undefined,
				membershipId: undefined,
				organizationId: undefined,
				roleId: undefined,
				resourceType: undefined,
				resourceId: undefined,
				ip: undefined,
				startDate: undefined,
				endDate: undefined
			},
			{
				page: 1,
				limit: 20,
				sortBy: 'createdAt',
				sortOrder: 'asc',
				skip: 0
			}
		)

		expect(result.data).toEqual([mockAudit1, mockAudit2])
		expect(result.metadata).toBeDefined()
		expect(result.metadata).toHaveProperty('queriedAt')
		expect(result.metadata).toHaveProperty('appliedFilters')
		expect(result.metadata!.appliedFilters).toEqual([])
		expect(result.metadata).toHaveProperty('pagination')
		expect(result.metadata!.pagination).toEqual(mockResponse.pagination)

		expect(job.logger.info).toHaveBeenCalledWith(
			{ filters: {} },
			'Finding audit records'
		)
		expect(job.logger.info).toHaveBeenCalledWith(
			{
				totalItems: 2,
				currentPage: 1,
				itemsReturned: 2
			},
			'Audit records retrieved successfully'
		)
	})

	it('should retrieve audit records with custom pagination', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [mockAudit2, mockAudit3],
			pagination: {
				currentPage: 2,
				totalPages: 3,
				totalItems: 50,
				itemsPerPage: 10,
				hasNextPage: true,
				hasPreviousPage: true
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({
			page: 2,
			limit: 10,
			sortBy: 'timestamp',
			sortOrder: 'desc'
		})

		const result = await useCase.run(job)

		expect(auditRepo.find).toHaveBeenCalledWith(expect.any(Object), {
			page: 2,
			limit: 10,
			sortBy: 'timestamp',
			sortOrder: 'desc',
			skip: 10
		})

		expect(result.data).toEqual([mockAudit2, mockAudit3])
		expect(result.metadata).toBeDefined()
		expect(result.metadata!.pagination).toEqual(mockResponse.pagination)
	})

	it('should filter audit records by userId', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [mockAudit1, mockAudit2],
			pagination: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 2,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({ userId: 'user-1' })

		const result = await useCase.run(job)

		expect(auditRepo.find).toHaveBeenCalledWith(
			expect.objectContaining({
				userId: 'user-1'
			}),
			expect.any(Object)
		)

		expect(result.data).toEqual([mockAudit1, mockAudit2])
		expect(result.metadata).toBeDefined()
		expect(result.metadata!.appliedFilters).toEqual(['userId'])
	})

	it('should filter audit records by multiple criteria', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [mockAudit3],
			pagination: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 1,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({
			action: 'user.create',
			organizationId: 'org-2',
			resourceType: 'user'
		})

		const result = await useCase.run(job)

		expect(auditRepo.find).toHaveBeenCalledWith(
			expect.objectContaining({
				action: 'user.create',
				organizationId: 'org-2',
				resourceType: 'user'
			}),
			expect.any(Object)
		)

		expect(result.data).toEqual([mockAudit3])
		expect(result.metadata).toBeDefined()
		expect(result.metadata!.appliedFilters).toEqual([
			'action',
			'organizationId',
			'resourceType'
		])
	})

	it('should filter audit records by date range', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [mockAudit2, mockAudit3],
			pagination: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 2,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({
			startDate: '2026-01-04T10:30:00Z',
			endDate: '2026-01-04T12:30:00Z'
		})

		const result = await useCase.run(job)

		expect(auditRepo.find).toHaveBeenCalledWith(
			expect.objectContaining({
				startDate: new Date('2026-01-04T10:30:00Z'),
				endDate: new Date('2026-01-04T12:30:00Z')
			}),
			expect.any(Object)
		)

		expect(result.data).toEqual([mockAudit2, mockAudit3])
		expect(result.metadata).toBeDefined()
		expect(result.metadata!.appliedFilters).toEqual(['startDate', 'endDate'])
	})

	it('should return empty array when no records match filters', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [],
			pagination: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 0,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({ userId: 'nonexistent-user' })

		const result = await useCase.run(job)

		expect(result.data).toEqual([])
		expect(result.metadata).toBeDefined()
		expect(result.metadata!.pagination).toBeDefined()
		expect(result.metadata!.pagination.totalItems).toBe(0)
	})

	it('should propagate repository errors', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const repositoryError = new Error('Database connection failed')
		auditRepo.find.mockRejectedValue(repositoryError)

		const job = makeJob({})

		await expect(useCase.run(job)).rejects.toThrow('Database connection failed')

		expect(auditRepo.find).toHaveBeenCalled()
	})

	it('should filter by all available criteria', async () => {
		const container = makeContainer()
		const useCase = new AuditFindUseCase(container)

		const mockResponse: PaginatedResponse<Audit> = {
			items: [mockAudit1],
			pagination: {
				currentPage: 1,
				totalPages: 1,
				totalItems: 1,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			}
		}

		auditRepo.find.mockResolvedValue(mockResponse)

		const job = makeJob({
			id: 'audit-1',
			action: 'user.login',
			jobId: 'job-1',
			userId: 'user-1',
			userEmail: 'user1@example.com',
			organizationId: 'org-1',
			resourceType: 'user',
			resourceId: 'resource-1',
			ip: '192.168.1.1',
			startDate: '2026-01-04T09:00:00Z',
			endDate: '2026-01-04T11:00:00Z'
		})

		const result = await useCase.run(job)

		expect(auditRepo.find).toHaveBeenCalledWith(
			{
				id: 'audit-1',
				action: 'user.login',
				jobId: 'job-1',
				userId: 'user-1',
				userEmail: 'user1@example.com',
				organizationId: 'org-1',
				resourceType: 'user',
				resourceId: 'resource-1',
				ip: '192.168.1.1',
				startDate: new Date('2026-01-04T09:00:00Z'),
				endDate: new Date('2026-01-04T11:00:00Z')
			},
			expect.any(Object)
		)

		expect(result.metadata).toBeDefined()
		expect(result.metadata!.appliedFilters).toEqual([
			'id',
			'action',
			'jobId',
			'userId',
			'userEmail',
			'organizationId',
			'resourceType',
			'resourceId',
			'ip',
			'startDate',
			'endDate'
		])
	})
})
