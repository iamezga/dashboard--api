import { Logger } from 'pino'
import { Mocked, vi } from 'vitest'
import { RepositoryManager } from '../../../core/repositoryManager'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { AuditInput } from '../entities/Audit'
import { AuditFilters } from '../entities/AuditFilters'
import { MongoAuditRepository } from './MongoAuditRepository'

describe('MongoAuditRepository', () => {
	let repository: MongoAuditRepository
	let dbMock: any
	let collectionMock: any
	let repositoryManagerMock: Mocked<RepositoryManager>
	let loggerMock: Mocked<Logger>
	let containerMock: DependencyContainer

	beforeEach(() => {
		collectionMock = {
			insertOne: vi.fn(),
			findOne: vi.fn(),
			find: vi.fn(),
			countDocuments: vi.fn()
		} as any

		dbMock = {
			collection: vi.fn().mockReturnValue(collectionMock)
		}

		repositoryManagerMock = {
			getUserRepository: vi.fn(),
			getSessionRepository: vi.fn(),
			getPermissionRepository: vi.fn(),
			getRoleRepository: vi.fn()
		} as unknown as Mocked<RepositoryManager>

		loggerMock = {
			error: vi.fn(),
			info: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn()
		} as any

		containerMock = {
			repositoryManager: repositoryManagerMock,
			logger: loggerMock
		} as unknown as DependencyContainer

		// Use constructor injection instead of setContext
		repository = new MongoAuditRepository(dbMock, containerMock)
	})

	it('should cover getCustomContainer return and call insertOne successfully', async () => {
		const auditInput: AuditInput = {
			action: 'CREATE' as any,
			jobId: 'job123',
			timestamp: new Date(),
			user: {
				userId: 'u1',
				userEmail: 'user@example.com',
				organizationId: 'org1',
				roleId: 'role1',
				actorType: 'user'
			},
			resource: {
				resourceType: 'User',
				resourceId: '123'
			},
			payload: { extra: 'data' },
			ip: '127.0.0.1',
			classification: {
				category: 'access' as any,
				severity: 'medium' as any,
				result: {
					status: 'success' as any
				}
			}
		}

		await repository.insert(auditInput)

		expect(collectionMock.insertOne).toHaveBeenCalledWith({
			...auditInput,
			payload: {
				__auditMeta: {
					category: 'access',
					severity: 'medium',
					resultStatus: 'success',
					resultErrorCode: undefined,
					resultMessage: undefined,
					tags: []
				},
				data: { extra: 'data' }
			}
		})
	})

	it('should log error if insertOne fails', async () => {
		const auditInput: AuditInput = {
			action: 'DELETE' as any,
			jobId: 'job456',
			timestamp: new Date(),
			user: {
				userId: 'u2',
				userEmail: 'admin@example.com',
				organizationId: 'org2',
				roleId: 'role2',
				actorType: 'user'
			},
			resource: {
				resourceType: 'User',
				resourceId: '456'
			},
			classification: {
				category: 'security' as any,
				severity: 'high' as any,
				result: {
					status: 'failure' as any,
					errorCode: 'ERR_DELETE',
					message: 'Failed to delete user'
				}
			},
			payload: { reason: 'violation of terms' },
			ip: '127.0.0.1'
		}

		const error = new Error('insert failed')
		collectionMock.insertOne.mockRejectedValueOnce(error)

		await repository.insert(auditInput)

		expect(loggerMock.error).toHaveBeenCalledWith(
			{ error },
			'Failed to insert audit record (Mongo).'
		)
	})

	describe('findById', () => {
		it('should find audit record by id', async () => {
			const mockAudit = {
				_id: 'audit-1',
				action: 'user.get' as any,
				jobId: 'job-1',
				timestamp: new Date()
			}
			collectionMock.findOne.mockResolvedValue(mockAudit)

			const result = await repository.findById('audit-1')

			expect(collectionMock.findOne).toHaveBeenCalledWith({ _id: 'audit-1' })
			expect(result).toEqual(mockAudit)
		})

		it('should return null when record not found', async () => {
			collectionMock.findOne.mockResolvedValue(null)

			const result = await repository.findById('non-existent')

			expect(result).toBeNull()
		})

		it('should handle errors and return null', async () => {
			const error = new Error('Find failed')
			collectionMock.findOne.mockRejectedValue(error)

			const result = await repository.findById('audit-1')

			expect(result).toBeNull()
			expect(loggerMock.error).toHaveBeenCalledWith(
				{ error, id: 'audit-1' },
				'Failed to find audit record by ID (Mongo).'
			)
		})
	})

	describe('find', () => {
		const mockFindChain = {
			skip: vi.fn().mockReturnThis(),
			limit: vi.fn().mockReturnThis(),
			sort: vi.fn().mockReturnThis(),
			toArray: vi.fn()
		}

		beforeEach(() => {
			collectionMock.find.mockReturnValue(mockFindChain)
		})

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
					_id: '1',
					action: 'user.create' as any,
					jobId: 'j1',
					timestamp: new Date()
				},
				{
					_id: '2',
					action: 'user.get' as any,
					jobId: 'j2',
					timestamp: new Date()
				}
			]

			collectionMock.countDocuments.mockResolvedValue(2)
			mockFindChain.toArray.mockResolvedValue(mockRecords)

			const result = await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({})
			expect(mockFindChain.skip).toHaveBeenCalledWith(0)
			expect(mockFindChain.limit).toHaveBeenCalledWith(10)
			expect(mockFindChain.sort).toHaveBeenCalledWith({ timestamp: -1 })
			expect(result.items).toEqual(mockRecords)
			expect(result.pagination.totalItems).toBe(2)
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

			collectionMock.countDocuments.mockResolvedValue(1)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				action: 'user.create'
			})
			expect(mockFindChain.sort).toHaveBeenCalledWith({ timestamp: 1 })
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

			collectionMock.countDocuments.mockResolvedValue(5)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				'user.organizationId': 'org-123'
			})
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

			collectionMock.countDocuments.mockResolvedValue(3)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				'resource.resourceType': 'user'
			})
		})

		it('should filter with all possible filter fields', async () => {
			const filters: AuditFilters = {
				id: 'audit-1',
				action: 'user.create' as any,
				jobId: 'job-123',
				ip: '192.168.1.1',
				userId: 'user-456',
				userEmail: 'test@example.com',
				organizationId: 'org-789',
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

			collectionMock.countDocuments.mockResolvedValue(1)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				_id: 'audit-1',
				action: 'user.create',
				jobId: 'job-123',
				ip: '192.168.1.1',
				'user.userId': 'user-456',
				'user.userEmail': 'test@example.com',
				'user.organizationId': 'org-789',
				'resource.resourceType': 'user',
				'resource.resourceId': 'res-999'
			})
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

			collectionMock.countDocuments.mockResolvedValue(5)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				timestamp: { $gte: startDate, $lte: endDate }
			})
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

			collectionMock.countDocuments.mockResolvedValue(3)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				timestamp: { $gte: startDate }
			})
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

			collectionMock.countDocuments.mockResolvedValue(4)
			mockFindChain.toArray.mockResolvedValue([])

			await repository.find(filters, pagination)

			expect(collectionMock.find).toHaveBeenCalledWith({
				timestamp: { $lte: endDate }
			})
		})

		it('should return empty result on error', async () => {
			const error = new Error('Query failed')
			collectionMock.find.mockImplementation(() => {
				throw error
			})

			const result = await repository.find(
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
			expect(loggerMock.error).toHaveBeenCalled()
		})
	})
})
