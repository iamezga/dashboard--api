import * as Sentry from '@sentry/node'
import { AuditService } from './auditService'

jest.mock('@sentry/node', () => ({
	captureException: jest.fn()
}))

describe('AuditService', () => {
	const mockInsert = jest.fn()
	const mockAuditRepository = { insert: mockInsert }

	const baseJob = {
		getMeta: jest.fn(() => ({ ip: '127.0.0.1', sessionId: 'session-1' })),
		getUser: jest.fn(() => ({
			id: 'user-1',
			email: 'test@example.com',
			membership: {
				id: 'membership-1',
				organization: { id: 'org-1' },
				role: { id: 'role-1' }
			}
		})),
		getPublicUser: jest.fn(() => ({
			id: 'user-1',
			email: 'test@example.com'
		})),
		getId: jest.fn(() => 'job-123'),
		logger: { error: jest.fn() }
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should insert audit record when authenticated user exists', async () => {
		const service = new AuditService(mockAuditRepository as any)

		await service.record('auth.login', baseJob as any, 'session', '123', {
			field: 'value'
		})

		expect(mockInsert).toHaveBeenCalledTimes(1)
		const inserted = mockInsert.mock.calls[0][0]
		expect(inserted.action).toBe('auth.login')
		expect(inserted.user).toMatchObject({
			userId: 'user-1',
			userEmail: 'test@example.com',
			sessionId: 'session-1',
			membershipId: 'membership-1',
			organizationId: 'org-1',
			roleId: 'role-1'
		})
		expect(inserted.resource.resourceType).toBe('session')
		expect(inserted.payload).toEqual({ field: 'value' })
	})

	it('should insert audit record when overrides are provided for a public flow', async () => {
		const jobWithoutUser = {
			...baseJob,
			getUser: jest.fn(() => {
				throw new Error('no user in context')
			}),
			getPublicUser: jest.fn(() => undefined)
		}
		const service = new AuditService(mockAuditRepository as any)

		await service.record(
			'auth.login',
			jobWithoutUser as any,
			'session',
			'session-2',
			undefined,
			{
				userId: 'user-2',
				userEmail: 'public@example.com',
				sessionId: 'session-2'
			}
		)

		expect(mockInsert).toHaveBeenCalledTimes(1)
		expect(mockInsert.mock.calls[0][0].user).toMatchObject({
			userId: 'user-2',
			userEmail: 'public@example.com',
			sessionId: 'session-2'
		})
	})

	it('should insert anonymous audit when actor context cannot be resolved', async () => {
		const jobNoUser = {
			...baseJob,
			getUser: jest.fn(() => {
				throw new Error('no user in context')
			}),
			getPublicUser: jest.fn(() => null),
			getMeta: jest.fn(() => ({ ip: '127.0.0.1' }))
		}
		const service = new AuditService(mockAuditRepository as any)

		await service.record('auth.login', jobNoUser as any, 'session', '123')

		expect(mockInsert).toHaveBeenCalledTimes(1)
		expect(mockInsert.mock.calls[0][0].user).toMatchObject({
			actorType: 'anonymous',
			userId: 'anonymous',
			userEmail: 'anonymous@local'
		})
	})

	it('should insert system audit when no user identity and execution source is internal', async () => {
		const jobSystem = {
			...baseJob,
			getUser: jest.fn(() => {
				throw new Error('no user in context')
			}),
			getPublicUser: jest.fn(() => null),
			getMeta: jest.fn(() => ({
				ip: '127.0.0.1',
				executionSource: 'worker',
				initiatedBy: 'system'
			}))
		}
		const service = new AuditService(mockAuditRepository as any)

		await service.record(
			'resource.updated',
			jobSystem as any,
			'cache',
			'entry-1'
		)

		expect(mockInsert).toHaveBeenCalledTimes(1)
		expect(mockInsert.mock.calls[0][0].user).toMatchObject({
			actorType: 'system',
			userId: 'system',
			userEmail: 'system@local'
		})
	})

	it('should log error and send to Sentry if insert fails', async () => {
		const error = new Error('DB fail')
		mockInsert.mockRejectedValueOnce(error)

		const service = new AuditService(mockAuditRepository as any)

		await service.record('auth.login', baseJob as any, 'session', '123')

		expect(baseJob.logger.error).toHaveBeenCalledWith(
			{ error },
			'Failed to record audit event.'
		)
		expect(Sentry.captureException).toHaveBeenCalledWith(
			error,
			expect.any(Object)
		)
	})
})
