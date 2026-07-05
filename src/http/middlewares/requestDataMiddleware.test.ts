import { NextFunction, Request, Response } from 'express'
import { vi } from 'vitest'
import '../../types/express.d.ts'
import { requestDataMiddleware } from './requestDataMiddleware'

const mockRequest = (
	options: {
		method?: string
		body?: Record<string, any>
		files?: Record<string, any>[]
	} = {}
) => {
	const req: Partial<Request> = {
		ip: '127.0.0.1',
		headers: {
			'user-agent': 'Test Test',
			referer: 'http://test.com',
			origin: 'http://test.com'
		},
		originalUrl: '/api/v1/test',
		method: options.method || 'GET',
		...(options.files && { files: options.files }),
		...(options.body && { body: options.body })
	}
	return req as Request // cast Request
}

const mockResponse = () => {
	const res: Partial<Response> = {}
	return res as Response
}

const mockNext: NextFunction = vi.fn()

describe('requestDataMiddleware', () => {
	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should attach requestData to the request object for API calls', () => {
		const req = mockRequest({
			method: 'POST'
		})
		const res = mockResponse()

		requestDataMiddleware()(req, res, mockNext)

		expect(req.requestData).toBeDefined()
		expect(req.requestData.id).toBeDefined()
		expect(typeof req.requestData.meta.timestamp).toBe('number')
		expect(req.requestData.meta.url).toBe('/api/v1/test')
		expect(req.requestData.meta.ip).toBe('127.0.0.1')
		expect(req.requestData.meta.userAgent).toBe('Test Test')
		expect(req.requestData.meta.referer).toBe('http://test.com')
		expect(req.requestData.meta.origin).toBe('http://test.com')

		// Verify that next() was called once
		expect(mockNext).toHaveBeenCalledTimes(1)
	})

	it('should call next() and not attach requestData for non-API calls', () => {
		const req = mockRequest()
		req.originalUrl = '/favicon.ico' // Simulate a call that is not an endpoint of the API

		const res = mockResponse()

		requestDataMiddleware()(req, res, mockNext)

		// Verify that there is no requestData prop in Request
		expect(req.requestData).toBeUndefined()

		expect(mockNext).toHaveBeenCalledTimes(1)
	})
})
