import { AuditInput } from '../entities/Audit'
import { PostgresAuditRepository } from './PostgresAuditRepository'

describe('PostgresAuditRepository', () => {
	let mockPrisma: any
	let repo: PostgresAuditRepository
	const mockLogger = { info: jest.fn(), error: jest.fn(), warn: jest.fn() }

	beforeEach(() => {
		mockPrisma = {
			audit: {
				create: jest.fn().mockResolvedValue({})
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
			user: {
				userId: 'u1',
				userEmail: 'a@b.com',
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
			user: {
				userId: 'u2',
				userEmail: 'b@c.com',
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
})
