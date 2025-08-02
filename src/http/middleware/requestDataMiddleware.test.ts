import { NextFunction, Request, Response } from 'express' // Importamos Request, Response, NextFunction para los mocks
import '../../types/express.d.ts'
import { requestDataMiddleware } from './requestDataMiddleware'

const mockRequest = () => {
	const req: Partial<Request> = {
		ip: '127.0.0.1',
		headers: {
			'user-agent': 'Jest Test',
			referer: 'http://test.com',
			origin: 'http://test.com'
		},
		method: 'GET',
		originalUrl: '/api/v1/test'
	}
	return req as Request // cast Request
}

const mockResponse = () => {
	const res: Partial<Response> = {}
	return res as Response
}

const mockNext: NextFunction = jest.fn()

describe('requestDataMiddleware', () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should attach requestData to the request object for API calls', () => {
		const req = mockRequest()
		const res = mockResponse()

		requestDataMiddleware(req, res, mockNext)

		expect(req.requestData).toBeDefined()
		expect(req.requestData.id).toBeDefined()
		expect(req.requestData.method).toBe('GET')
		expect(req.requestData.url).toBe('/api/v1/test')
		expect(req.requestData.ip).toBe('127.0.0.1')
		expect(req.requestData.userAgent).toBe('Jest Test')
		expect(req.requestData.referer).toBe('http://test.com')
		expect(req.requestData.origin).toBe('http://test.com')
		expect(req.requestData.timestamp).toBeInstanceOf(Date)

		// Verify that next() was called once
		expect(mockNext).toHaveBeenCalledTimes(1)
	})

	it('should call next() and not attach requestData for non-API calls', () => {
		const req = mockRequest()
		req.originalUrl = '/favicon.ico' // Simulate a call that is not an endpoint of the API

		const res = mockResponse()

		requestDataMiddleware(req, res, mockNext)

		// Verify that there is no requestData prop in Request
		expect(req.requestData).toBeUndefined()

		expect(mockNext).toHaveBeenCalledTimes(1)
	})
})
