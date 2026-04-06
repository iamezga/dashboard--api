import { AuditInput } from '../entities/Audit'
import { AuditFilters } from '../entities/AuditFilters'
import { PostgresAuditRepository } from './PostgresAuditRepository'

describe('PostgresAuditRepository', () => {
	let mockPrisma: any
	let repo: PostgresAuditRepository
	const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() }

	beforeEach(() => {
		mockPrisma = {
			audit: {
				create: jest.fn().mockResolvedValue({}),
				findUnique: jest.fn(),
				findMany: jest.fn(),
				count: jest.fn()
			}
		}
		// Use constructor injection instead of setContext
		repo = new PostgresAuditRepository(mockPrisma, {
			repositoryManager: {},
			logger: mockLogger
		} as any)
		jest.clearAllMocks()
	})

	it('inserts audit record successfully', async () => {
		const payload: AuditInput = {
			action: 'auth.login',
			jobId: 'job-1',
			timestamp: new Date(),
			classification: {
				category: 'security',
				severity: 'info',
				result: { status: 'success' }
			},
			user: {
				actorType: 'user',
				userId: 'u1',
				userEmail: 'a@b.com',
				sessionId: 's1',
				membershipId: 'm1',
				organizationId: 'org1',
				roleId: 'r1'
			},
			resource: { resourceType: 'session', resourceId: 's1' }
		}

		await expect(repo.insert(payload)).resolves.toBeUndefined()
		expect(mockPrisma.audit.create).toHaveBeenCalledWith(
			expect.objectContaining({ data: expect.any(Object) })
		)
		expect(mockLogger.error).not.toHaveBeenCalled()
	})

	it('logs error when prisma.create throws and does not rethrow', async () => {
		const err = new Error('insert-fail')
		mockPrisma.audit.create.mockRejectedValueOnce(err)

		const payload: AuditInput = {
			action: 'auth.login',
			jobId: 'job-2',
			timestamp: new Date(),
			classification: {
				category: 'security',
				severity: 'warning',
				result: { status: 'failed' }
			},
			user: {
				actorType: 'user',
				userId: 'u2',
				userEmail: 'b@c.com',
				sessionId: 's2',
				membershipId: 'm2',
				organizationId: 'org2',
				roleId: 'r2'
			},
			resource: { resourceType: 'session', resourceId: 's2' }
		}

		await expect(repo.insert(payload)).resolves.toBeUndefined()
		expect(mockPrisma.audit.create).toHaveBeenCalled()
		expect(mockLogger.error).toHaveBeenCalledWith(
			{ error: err },
			'Failed to insert audit record (Postgres).'
		)
	})

	describe('findById', () => {
		it('should find audit record by id', async () => {
			const mockRecord = {
				id: 'audit-1',
				action: 'user.get',
				jobId: 'job-1',
				timestamp: new Date(),
				user: { userId: 'u1', userEmail: 'a@b.com' },
				resource: { resourceType: 'user', resourceId: 'r1' },
				payload: null,
				ip: '127.0.0.1'
			}
			mockPrisma.audit.findUnique.mockResolvedValue(mockRecord)

			const result = await repo.findById('audit-1')

			expect(mockPrisma.audit.findUnique).toHaveBeenCalledWith({
				where: { id: 'audit-1' }
			})
			expect(result).toBeDefined()
			expect(result?._id).toBe('audit-1')
			expect(result?.action).toBe('user.get')
		})

		it('should return null when record not found', async () => {
			mockPrisma.audit.findUnique.mockResolvedValue(null)

			const result = await repo.findById('non-existent')

			expect(result).toBeNull()
		})

		it('should handle ip as null and convert to undefined', async () => {
			const mockRecord = {
				id: 'audit-2',
				action: 'user.create',
				jobId: 'job-2',
				timestamp: new Date(),
				user: { userId: 'u2' },
				resource: { resourceType: 'user', resourceId: 'r2' },
				payload: null,
				ip: null
			}
			mockPrisma.audit.findUnique.mockResolvedValue(mockRecord)

			const result = await repo.findById('audit-2')

			expect(result).toBeDefined()
			expect(result?.ip).toBeUndefined()
		})

		it('should handle errors and return null', async () => {
			const error = new Error('Find failed')
			mockPrisma.audit.findUnique.mockRejectedValue(error)

			const result = await repo.findById('audit-1')

			expect(result).toBeNull()
			expect(mockLogger.error).toHaveBeenCalledWith(
				{ error, id: 'audit-1' },
				'Failed to find audit record by ID (Postgres).'
			)
		})
	})

	describe('find', () => {
		it('should find records with basic pagination', async () => {
			const filters: AuditFilters = {}
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			const mockRecords = [
				{
					id: '1',
					action: 'user.create',
					jobId: 'j1',
					timestamp: new Date(),
					user: {},
					resource: {},
					payload: null,
					ip: null
				}
			]

			mockPrisma.audit.count.mockResolvedValue(1)
			mockPrisma.audit.findMany.mockResolvedValue(mockRecords)

			const result = await repo.find(filters, pagination)

			expect(mockPrisma.audit.count).toHaveBeenCalledWith({ where: {} })
			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith({
				where: {},
				skip: 0,
				take: 10,
				orderBy: { timestamp: 'desc' }
			})
			expect(result.items).toHaveLength(1)
			expect(result.pagination.totalItems).toBe(1)
		})

		it('should filter with all possible filter fields', async () => {
			const filters: AuditFilters = {
				id: 'audit-1',
				action: 'user.create' as any,
				jobId: 'job-123',
				ip: '192.168.1.1',
				userId: 'user-456',
				userEmail: 'test@example.com',
				sessionId: 'session-321',
				membershipId: 'membership-654',
				organizationId: 'org-789',
				roleId: 'role-987',
				resourceType: 'user',
				resourceId: 'res-999'
			}
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(1)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						id: 'audit-1',
						action: 'user.create',
						jobId: 'job-123',
						ip: '192.168.1.1',
						AND: [
							{ user: { path: ['userId'], equals: 'user-456' } },
							{ user: { path: ['userEmail'], equals: 'test@example.com' } },
							{ user: { path: ['sessionId'], equals: 'session-321' } },
							{ user: { path: ['membershipId'], equals: 'membership-654' } },
							{ user: { path: ['organizationId'], equals: 'org-789' } },
							{ user: { path: ['roleId'], equals: 'role-987' } },
							{ resource: { path: ['resourceType'], equals: 'user' } },
							{ resource: { path: ['resourceId'], equals: 'res-999' } }
						]
					}
				})
			)
		})

		it('should filter by action', async () => {
			const filters: AuditFilters = { action: 'user.create' as any }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'asc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(0)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: { action: 'user.create' },
					orderBy: { timestamp: 'asc' }
				})
			)
		})

		it('should filter by date range', async () => {
			const startDate = new Date('2026-01-01')
			const endDate = new Date('2026-01-31')
			const filters: AuditFilters = { startDate, endDate }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(5)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						timestamp: {
							gte: startDate,
							lte: endDate
						}
					}
				})
			)
		})

		it('should filter by startDate only', async () => {
			const startDate = new Date('2026-01-01')
			const filters: AuditFilters = { startDate }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(3)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						timestamp: { gte: startDate }
					}
				})
			)
		})

		it('should filter by endDate only', async () => {
			const endDate = new Date('2026-01-31')
			const filters: AuditFilters = { endDate }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(4)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						timestamp: { lte: endDate }
					}
				})
			)
		})

		it('should filter by userEmail', async () => {
			const filters: AuditFilters = { userEmail: 'test@example.com' }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(2)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						AND: [{ user: { path: ['userEmail'], equals: 'test@example.com' } }]
					}
				})
			)
		})

		it('should filter by organizationId', async () => {
			const filters: AuditFilters = { organizationId: 'org-123' }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(7)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						AND: [{ user: { path: ['organizationId'], equals: 'org-123' } }]
					}
				})
			)
		})

		it('should filter by resourceType', async () => {
			const filters: AuditFilters = { resourceType: 'user' }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(6)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						AND: [{ resource: { path: ['resourceType'], equals: 'user' } }]
					}
				})
			)
		})

		it('should filter by resourceId', async () => {
			const filters: AuditFilters = { resourceId: 'res-456' }
			const pagination = {
				page: 1,
				limit: 10,
				skip: 0,
				sortBy: 'timestamp',
				sortOrder: 'desc' as const
			}

			mockPrisma.audit.count.mockResolvedValue(2)
			mockPrisma.audit.findMany.mockResolvedValue([])

			await repo.find(filters, pagination)

			expect(mockPrisma.audit.findMany).toHaveBeenCalledWith(
				expect.objectContaining({
					where: {
						AND: [{ resource: { path: ['resourceId'], equals: 'res-456' } }]
					}
				})
			)
		})

		it('should return empty result on error', async () => {
			const error = new Error('Query failed')
			mockPrisma.audit.count.mockRejectedValue(error)

			const result = await repo.find(
				{},
				{
					page: 1,
					limit: 10,
					skip: 0,
					sortBy: 'timestamp',
					sortOrder: 'desc'
				}
			)

			expect(result.items).toEqual([])
			expect(result.pagination.totalItems).toBe(0)
			expect(mockLogger.error).toHaveBeenCalled()
		})
	})
})
