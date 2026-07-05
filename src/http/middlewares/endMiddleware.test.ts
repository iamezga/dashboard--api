import { NextFunction, Request, Response } from 'express'
import { Logger } from 'pino'
import { vi } from 'vitest'
import { Job } from '../../lib/Job'
import { endMiddleware } from './endMiddleware'

describe('endMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: ReturnType<typeof vi.fn>
	let job: Partial<Job>
	let mockLogger: Partial<Logger>

	beforeEach(() => {
		req = {}
		next = vi.fn()

		mockLogger = {
			info: vi.fn()
		}

		job = {
			getMeta: vi.fn().mockReturnValue({ timestamp: Date.now() - 50 }),
			logger: mockLogger as Logger
		}

		res = {
			locals: { job },
			statusCode: 200,
			statusMessage: 'OK'
		} as Partial<Response>
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
		;(job.getMeta as ReturnType<typeof vi.fn>).mockImplementation(() => {
			throw new Error('boom')
		})

		endMiddleware(req as Request, res as Response, next as NextFunction)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
		expect((next.mock.calls[0][0] as Error).message).toBe('boom')
	})
})
