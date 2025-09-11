import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { endMiddleware } from '../../http/middlewares/endMiddleware'
import { Job } from '../../lib/Job'

describe('endMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: jest.Mock
	let job: Partial<Job>
	let mockLogger: Partial<Logger>

	beforeEach(() => {
		req = {}
		next = jest.fn()

		mockLogger = {
			info: jest.fn()
		}

		job = {
			getMeta: jest.fn().mockReturnValue({ timestamp: Date.now() - 50 }),
			logger: mockLogger as Logger
		}

		res = {
			locals: { job },
			statusCode: 200,
			statusMessage: 'OK'
		}
	})

	it('should call next() if job is missing', () => {
		res = { locals: {} } as Partial<Response>

		endMiddleware(req as Request, res as Response, next as NextFunction)

		expect(next).toHaveBeenCalledWith()
		expect(mockLogger.info).not.toHaveBeenCalled()
	})

	it('should log request completion with latency and call next()', () => {
		endMiddleware(req as Request, res as Response, next as NextFunction)

		expect(mockLogger.info).toHaveBeenCalledWith(
			expect.objectContaining({
				responseStatus: 200,
				responseMessage: 'OK',
				latency: expect.stringMatching(/ms$/)
			}),
			'Request completed.'
		)
		expect(next).toHaveBeenCalledWith()
	})

	it('should forward errors to next()', () => {
		;(job.getMeta as jest.Mock).mockImplementation(() => {
			throw new Error('boom')
		})

		endMiddleware(req as Request, res as Response, next as NextFunction)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
		expect((next.mock.calls[0][0] as Error).message).toBe('boom')
	})
})
