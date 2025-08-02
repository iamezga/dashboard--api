import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import {
	BadRequestError,
	ForbiddenError,
	HttpStatusCode,
	NotFoundError,
	UnauthorizedError
} from '../../errors'
import config from '../../services/config'
import { errorMiddleware } from './errorMiddleware'

const mockRequest = {} as Request
const mockNext = jest.fn() as NextFunction

const createMockResponse = () => {
	const res: Partial<Response> = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn()
	}
	return res as Response
}

jest.mock('@/services/config', () => ({
	get: jest.fn()
}))

jest.mock('@sentry/node', () => ({
	captureException: jest.fn()
}))

const originalProcessEnv = process.env
const originalConfigGet = config.get

describe('errorMiddleware', () => {
	let mockRes: Response

	beforeEach(() => {
		mockRes = createMockResponse()
		jest.clearAllMocks()

		process.env = { ...originalProcessEnv }
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'sentry.dsn') return 'http://mock-sentry-dsn.com'
			if (key === 'env') return process.env.NODE_ENV
			return (originalConfigGet as any)(key)
		})

		jest
			.spyOn(Sentry, 'captureException')
			.mockImplementation(() => 'mock-event-id')
		jest.spyOn(console, 'log').mockImplementation(() => {})
	})

	afterEach(() => {
		process.env = originalProcessEnv
		;(config.get as jest.Mock).mockImplementation(originalConfigGet)
		jest.restoreAllMocks()
	})

	it('should handle BadRequestError with 400 status, message, name, and validation errors', async () => {
		const validationErrors = [
			{ message: 'Field "name" is required', field: 'name', type: 'required' }
		]
		const error = new BadRequestError('Invalid input data', validationErrors)

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST)
		expect(mockRes.json).toHaveBeenCalledWith({
			status: 'error',
			code: HttpStatusCode.BAD_REQUEST,
			name: 'BadRequestError',
			message: 'Invalid input data',
			errors: validationErrors
		})

		expect(Sentry.captureException).not.toHaveBeenCalled()
		expect(mockNext).not.toHaveBeenCalled()
	})
	it('should not include "errors" property when BadRequestError has no validation errors', async () => {
		// Simulates a BadRequeStError without specific validation errors
		const error = new BadRequestError(
			'Bad request, but not from validation',
			[]
		)

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.not.objectContaining({
				errors: expect.any(Array)
			})
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.BAD_REQUEST,
				name: 'BadRequestError',
				message: 'Bad request, but not from validation'
			})
		)
	})

	it('should handle NotFoundError with 404 status and correct message', async () => {
		const error = new NotFoundError('Resource was not found')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND)
		expect(mockRes.json).toHaveBeenCalledWith({
			status: 'error',
			code: HttpStatusCode.NOT_FOUND,
			name: 'NotFoundError',
			message: 'Resource was not found'
		})
		expect(Sentry.captureException).not.toHaveBeenCalled()
	})

	it('should handle UnauthorizedError with 401 status and correct message', async () => {
		const error = new UnauthorizedError('Authentication failed')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED)
		expect(mockRes.json).toHaveBeenCalledWith({
			status: 'error',
			code: HttpStatusCode.UNAUTHORIZED,
			name: 'UnauthorizedError',
			message: 'Authentication failed'
		})
		expect(Sentry.captureException).not.toHaveBeenCalled()
	})

	it('should handle ForbiddenError with 403 status and correct message', async () => {
		const error = new ForbiddenError('Access to resource denied')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.FORBIDDEN)
		expect(mockRes.json).toHaveBeenCalledWith({
			status: 'error',
			code: HttpStatusCode.FORBIDDEN,
			name: 'ForbiddenError',
			message: 'Access to resource denied'
		})
		expect(Sentry.captureException).not.toHaveBeenCalled()
	})

	it('should handle generic Error with 500 status and capture by Sentry in production', async () => {
		process.env.NODE_ENV = 'production'
		const error = new Error('A critical internal server error')
		error.stack = 'Mock stack trace for production error'

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith({
			status: 'error',
			code: HttpStatusCode.INTERNAL_SERVER_ERROR,
			name: 'InternalServerError',
			message: 'An unexpected error has occurred.'
		})
		expect(Sentry.captureException).toHaveBeenCalledTimes(1)
		expect(console.log).not.toHaveBeenCalled()
	})

	it('should handle generic Error with 500 status, message, and stack in development', async () => {
		process.env.NODE_ENV = 'development'
		const error = new Error('Database connection failed')
		error.stack = 'Mock stack trace\nLine 1\nLine 2'

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith({
			status: 'error',
			code: HttpStatusCode.INTERNAL_SERVER_ERROR,
			name: 'InternalServerError',
			message: 'Database connection failed',
			stack: error.stack
		})
		expect(Sentry.captureException).toHaveBeenCalledTimes(1)
		expect(console.log).toHaveBeenCalledWith(error.stack)
	})

	it('should not call Sentry if sentry.dsn is not configured', async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'sentry.dsn') return null
			if (key === 'env') return process.env.NODE_ENV

			return (originalConfigGet as any)(key)
		})
		const error = new Error('Error when Sentry DSN is not configured')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(Sentry.captureException).not.toHaveBeenCalled()
	})

	it('should handle an error without a message property', async () => {
		process.env.NODE_ENV = 'development'
		const error = new Error()
		error.name = 'Test Error' // Just for test

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'An unexpected error has occurred.'
			})
		)
	})
})
