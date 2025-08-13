import { NextFunction, Request, Response } from 'express'
import { Job } from '../../lib/Job'
import { jobMiddleware } from './jobMiddleware'

const mockRequest = () => {
	return {
		headers: {},
		requestData: {
			id: 'mock-uuid',
			attempts: 1,
			payload: { data: 'test' },
			recaptchaResponse: 'mock-recaptcha-token',
			meta: {
				timestamp: 1678886400000,
				method: 'POST',
				url: '/api/test'
			}
		}
	} as unknown as Request
}

const mockResponse = () => {
	return {
		locals: {},
		set: jest.fn()
	} as unknown as Response
}

const mockNext = jest.fn() as jest.Mock<NextFunction>

describe('jobMiddleware', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	test('should call next() with an error if req.requestData is missing', () => {
		const req = { requestData: undefined } as unknown as Request
		const res = mockResponse()

		jobMiddleware(req, res, mockNext)

		expect(mockNext).toHaveBeenCalledTimes(1)
		const errorArgument = mockNext.mock.calls[0][0]
		expect(errorArgument).toBeInstanceOf(Error)
		expect(errorArgument.message).toContain(
			'`requestDataMiddleware` must be run before `jobMiddleware`.'
		)
	})

	test('should correctly create and attach a Job instance to res.locals', () => {
		const req = mockRequest()
		const res = mockResponse()

		jobMiddleware(req, res, mockNext)

		expect(res.locals.job).toBeInstanceOf(Job)
		const jobInstance = res.locals.job as Job
		expect(jobInstance.getId()).toBe('mock-uuid')
		expect(jobInstance.getAttempts()).toBe(1)
		expect(jobInstance.getData()).toEqual({ data: 'test' })
		expect(jobInstance.getRecaptchaResponse()).toBe('mock-recaptcha-token')
		expect(jobInstance.getMeta()).toEqual({
			timestamp: 1678886400000,
			method: 'POST',
			url: '/api/test'
		})
		expect(mockNext).toHaveBeenCalledTimes(1)
	})

	test('should set response headers for traceability', () => {
		const req = mockRequest()
		const res = mockResponse()

		jobMiddleware(req, res, mockNext)

		expect(res.set).toHaveBeenCalledWith({
			'x-job-id': 'mock-uuid',
			'x-job-attempts': 1,
			'x-job-progress': 0
		})
	})

	test('should handle missing optional data gracefully', () => {
		const req = {
			headers: {},
			requestData: {
				id: 'mock-uuid-2',
				attempts: 1,
				payload: {},
				meta: {
					timestamp: 1678886400000,
					method: 'GET',
					url: '/api/optional'
				}
			}
		} as unknown as Request
		const res = mockResponse()

		jobMiddleware(req, res, mockNext)

		const jobInstance = res.locals.job as Job
		expect(jobInstance.getRecaptchaResponse()).toBeUndefined()
		expect(mockNext).toHaveBeenCalledTimes(1)
	})
})
