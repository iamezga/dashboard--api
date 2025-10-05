import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { UnauthorizedError } from '../../errors'
import { Job } from '../../lib/Job'
import { authLoggerMiddleware } from './authLoggerMiddleware'

describe('authLoggerMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: jest.Mock
	let job: Partial<Job>
	let mockLogger: Partial<Logger>

	beforeEach(() => {
		req = {}
		next = jest.fn()

		mockLogger = {
			child: jest.fn().mockReturnValue({
				info: jest.fn(),
				error: jest.fn()
			})
		}

		job = {
			getUser: jest.fn(),
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
		;(job.getUser as jest.Mock).mockReturnValue(null)

		authLoggerMiddleware(req as Request, res as Response, next as NextFunction)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect((next.mock.calls[0][0] as UnauthorizedError).message).toContain(
			'user data missing'
		)
	})

	it('should enrich logger with user details and call next()', () => {
		const user = { id: 'u1', organizationId: 'org1', roleId: 'role1' }
		;(job.getUser as jest.Mock).mockReturnValue(user)

		authLoggerMiddleware(req as Request, res as Response, next as NextFunction)

		expect(mockLogger.child).toHaveBeenCalledWith({
			userId: 'u1',
			organizationId: 'org1',
			userRole: 'role1'
		})
		expect(job.logger).toHaveProperty('info')
		expect(next).toHaveBeenCalledWith()
	})
})
