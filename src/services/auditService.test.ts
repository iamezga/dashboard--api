import * as Sentry from '@sentry/node'
import { AuditService } from './auditService'

jest.mock('@sentry/node', () => ({
	captureException: jest.fn()
}))

describe('AuditService', () => {
	const mockInsert = jest.fn()
	const mockAuditRepository = { insert: mockInsert }

	const baseJob = {
		getMeta: jest.fn(() => ({ ip: '127.0.0.1' })),
		getPublicUser: jest.fn(() => ({
			id: 'user-1',
			email: 'test@example.com',
			organizationId: 'org-1',
			roleId: 'role-1'
		})),
		getId: jest.fn(() => 'job-123'),
		logger: { error: jest.fn() }
	}

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should insert audit record when user exists', async () => {
		const service = new AuditService(mockAuditRepository as any)

		await service.record('CREATE' as any, baseJob as any, 'User', '123', {
			field: 'value'
		})

		expect(mockInsert).toHaveBeenCalledTimes(1)
		const inserted = mockInsert.mock.calls[0][0]
		expect(inserted.action).toBe('CREATE')
		expect(inserted.user.userId).toBe('user-1')
		expect(inserted.resource.resourceType).toBe('User')
		expect(inserted.payload).toEqual({ field: 'value' })
	})

	it('should not insert anything if no user is returned', async () => {
		const jobNoUser = { ...baseJob, getPublicUser: jest.fn(() => null) }
		const service = new AuditService(mockAuditRepository as any)

		await service.record('DELETE' as any, jobNoUser as any, 'User', '123')

		expect(mockInsert).not.toHaveBeenCalled()
	})

	it('should log error and send to Sentry if insert fails', async () => {
		const error = new Error('DB fail')
		mockInsert.mockRejectedValueOnce(error)

		const service = new AuditService(mockAuditRepository as any)

		await service.record('UPDATE' as any, baseJob as any, 'User', '123')

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
