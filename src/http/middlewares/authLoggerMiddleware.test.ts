import { vi } from 'vitest'
import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { UnauthorizedError } from '../../errors'
import { Job } from '../../lib/Job'
import { authLoggerMiddleware } from './authLoggerMiddleware'

describe('authLoggerMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: ReturnType<typeof vi.fn>
	let job: Partial<Job>
	let mockLogger: Partial<Logger>

	beforeEach(() => {
		req = {}
		next = vi.fn()

		mockLogger = {
			child: vi.fn().mockReturnValue({
				info: vi.fn(),
				error: vi.fn()
			})
		}

		job = {
			getUser: vi.fn(),
			logger: mockLogger as Logger
		}

		res = {
			locals: { job }
		} as Partial<Response>
	})

	it('should throw UnauthorizedError if job is missing', () => {
		res = { locals: {} } as Partial<Response>

		authLoggerMiddleware(req as Request, res as Response, next as NextFunction)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect((next.mock.calls[0][0] as UnauthorizedError).message).toContain(
			'missing job object'
		)
	})

	it('should throw UnauthorizedError if user is missing', () => {
		;(job.getUser as ReturnType<typeof vi.fn>).mockReturnValue(null)

		authLoggerMiddleware(req as Request, res as Response, next as NextFunction)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect((next.mock.calls[0][0] as UnauthorizedError).message).toContain(
			'user data missing'
		)
	})

	it('should enrich logger with user details and call next() with a selected membership', () => {
		const user = {
			id: 'u1',
			membership: { organization: { id: 'org1' }, role: { id: 'role1' } }
		}
		;(job.getUser as ReturnType<typeof vi.fn>).mockReturnValue(user)

		authLoggerMiddleware(req as Request, res as Response, next as NextFunction)

		expect(mockLogger.child).toHaveBeenCalledWith({
			userId: 'u1',
			organizationId: 'org1',
			userRole: 'role1'
		})
		expect(job.logger).toHaveProperty('info')
		expect(next).toHaveBeenCalledWith()
	})
	it('should enrich logger with user details and call next() without a selected membership', () => {
		const user = { id: 'u1', membership: null }
		;(job.getUser as ReturnType<typeof vi.fn>).mockReturnValue(user)

		authLoggerMiddleware(req as Request, res as Response, next as NextFunction)

		expect(mockLogger.child).toHaveBeenCalledWith({
			userId: 'u1',
			organizationId: undefined,
			userRole: undefined
		})
		expect(job.logger).toHaveProperty('info')
		expect(next).toHaveBeenCalledWith()
	})
})
