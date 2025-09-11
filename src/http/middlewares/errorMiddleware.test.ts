import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import {
	BadRequestError,
	ForbiddenError,
	HttpStatusCode,
	NotFoundError,
	UnauthorizedError
} from '../../errors'
import { Job } from '../../lib/Job'
import config from '../../services/config'
import logger from '../../services/logger'
import { errorMiddleware } from './errorMiddleware'

const mockRequest = {} as Request
const mockNext = jest.fn() as NextFunction

const mockGetPublicUser = jest.fn().mockReturnValue({ id: 'mock-user-id' })

// mock job with its own logger
const mockJobLogger = {
	error: jest.fn(),
	warn: jest.fn(),
	info: jest.fn(),
	child: jest.fn().mockReturnThis()
}

const mockJob = {
	getId: jest.fn().mockReturnValue('mock-job-id'),
	getPublicUser: mockGetPublicUser,
	getMeta: jest.fn().mockReturnValue({ status: 'in_progress' }),
	getData: jest.fn().mockReturnValue({ input: 'data' }),
	markFailed: jest.fn(),
	logger: mockJobLogger
} as unknown as Job

const createMockResponse = (jobMock?: any) => {
	const res: Partial<Response> = {
		status: jest.fn().mockReturnThis(),
		json: jest.fn(),
		locals: {
			job: jobMock
		}
	}
	return res as Response
}

jest.mock('@/lib/Job', () => ({
	Job: jest.fn(() => mockJob)
}))
jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn()
}))
jest.mock('@/services/config', () => ({
	get: jest.fn()
}))
jest.mock('crypto', () => ({
	randomUUID: jest.fn(() => 'mock-error-id')
}))
jest.mock('@sentry/node', () => ({
	withScope: jest.fn(cb => {
		const scope = {
			setTag: jest.fn(),
			setUser: jest.fn(),
			setExtra: jest.fn()
		}
		cb(scope)
	}),
	captureException: jest.fn()
}))

const originalProcessEnv = process.env

describe('errorMiddleware', () => {
	let mockRes: Response

	beforeEach(() => {
		mockRes = createMockResponse(mockJob)
		jest.clearAllMocks()
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'sentry.dsn') return 'http://mock-sentry-dsn.com'
			if (key === 'env') return process.env.NODE_ENV
			return null
		})
	})

	afterEach(() => {
		process.env = originalProcessEnv
	})

	it('should handle BadRequestError and call job.markFailed', async () => {
		const validationErrors = [
			{ message: 'error', field: 'name', type: 'required' }
		]
		const error = new BadRequestError('Invalid input data', validationErrors)
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.BAD_REQUEST,
				name: 'BadRequestError',
				message: 'Invalid input data',
				errors: validationErrors,
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				errorId: 'mock-error-id',
				user: { id: 'mock-user-id' }
			}),
			expect.any(String)
		)
		expect(mockJobLogger.error).not.toHaveBeenCalled()
	})

	it('should not include "errors" property when BadRequestError has no validation errors', async () => {
		const error = new BadRequestError(
			'Bad request, but not from validation',
			[]
		)
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.not.objectContaining({ errors: expect.any(Array) })
		)
	})

	it('should handle NotFoundError with 404 status and correct message', async () => {
		const error = new NotFoundError('Resource was not found')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.NOT_FOUND)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.NOT_FOUND,
				name: 'NotFoundError',
				message: 'Resource was not found',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.warn).toHaveBeenCalledTimes(1)
		expect(mockJobLogger.error).not.toHaveBeenCalled()
	})

	it('should handle UnauthorizedError with 401 status and correct message', async () => {
		const error = new UnauthorizedError('Authentication failed')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.UNAUTHORIZED)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.UNAUTHORIZED,
				name: 'UnauthorizedError',
				message: 'Authentication failed',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.warn).toHaveBeenCalledTimes(1)
		expect(mockJobLogger.error).not.toHaveBeenCalled()
	})

	it('should handle ForbiddenError with 403 status and correct message', async () => {
		const error = new ForbiddenError('Access to resource denied')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.FORBIDDEN)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.FORBIDDEN,
				name: 'ForbiddenError',
				message: 'Access to resource denied',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.warn).toHaveBeenCalledTimes(1)
		expect(mockJobLogger.error).not.toHaveBeenCalled()
	})

	it('should handle generic Error with 500 status and capture by Sentry in production', async () => {
		process.env.NODE_ENV = 'production'
		const error = new Error('A critical internal server error')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.INTERNAL_SERVER_ERROR,
				name: 'InternalServerError',
				message: 'An unexpected error has occurred.',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				errorId: 'mock-error-id',
				user: { id: 'mock-user-id' }
			}),
			expect.any(String)
		)
		expect(mockJobLogger.warn).not.toHaveBeenCalled()
	})

	it('should handle a generic Error (500) with message, stack, and Sentry context in development', async () => {
		process.env.NODE_ENV = 'development'
		const error = new Error('Database connection failed')
		error.stack = 'Mock stack trace\nLine 1\nLine 2'
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.INTERNAL_SERVER_ERROR,
				name: 'InternalServerError',
				message: 'Database connection failed',
				stack: error.stack,
				errorId: 'mock-error-id'
			})
		)
		expect(Sentry.withScope).toHaveBeenCalledTimes(1)
		expect(Sentry.captureException).toHaveBeenCalledTimes(1)
		expect(Sentry.captureException).toHaveBeenCalledWith(error)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'Database connection failed',
				stack: error.stack,
				errorId: 'mock-error-id'
			}),
			expect.any(String)
		)
	})

	it('should not call Sentry if sentry.dsn is not configured', async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'sentry.dsn') return null
			return key === 'env' ? 'development' : null
		})
		const error = new Error('Error when Sentry DSN is not configured')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(Sentry.withScope).not.toHaveBeenCalled()
		expect(Sentry.captureException).not.toHaveBeenCalled()
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
	})

	it('should not attempt to use job data if res.locals.job is not defined', async () => {
		const error = new Error('Error without Job in context')
		mockRes = createMockResponse(undefined)

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(Sentry.withScope).toHaveBeenCalledTimes(1)
		expect(Sentry.captureException).toHaveBeenCalledTimes(1)
		expect(mockJob.getId).not.toHaveBeenCalled()
		expect(mockJob.markFailed).not.toHaveBeenCalled()
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				jobId: undefined,
				user: undefined
			}),
			expect.any(String)
		)
	})
	it('should handle error objects that are not instances of Error gracefully', async () => {
		const error = { some: 'random object' } as any
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.INTERNAL_SERVER_ERROR,
				name: 'InternalServerError',
				message: 'An unexpected error has occurred.',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				errorId: 'mock-error-id',
				user: { id: 'mock-user-id' }
			}),
			expect.any(String)
		)
	})

	it('should handle errors with empty or null message', async () => {
		const error = new Error('')
		error.stack = ''
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.INTERNAL_SERVER_ERROR,
				name: 'InternalServerError',
				message: 'An unexpected error has occurred.',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.error).toHaveBeenCalled()
	})

	it('should call mockJob.getId when job exists and not call when job is undefined', async () => {
		const error = new Error('Test error')

		// defined Job
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockJob.getId).toHaveBeenCalled()

		// undefined Job
		mockRes = createMockResponse(undefined)
		jest.clearAllMocks()
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockJob.getId).not.toHaveBeenCalled()
	})

	it('should not call next() in the middleware (standard error handler behavior)', async () => {
		const error = new Error('Some error')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockNext).not.toHaveBeenCalled()
	})
	it('should call setUser with {} when job.getPublicUser() returns undefined', async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'env') return 'production'
			if (key === 'sentry.dsn') return 'dsn'
		})

		mockJob.getPublicUser = jest.fn().mockReturnValue(undefined)
		mockRes.locals.job = mockJob

		const error = new Error('boom')

		const setTag = jest.fn()
		const setUser = jest.fn()
		const setExtra = jest.fn()
		;(Sentry.withScope as jest.Mock).mockImplementation(cb => {
			cb({ setTag, setUser, setExtra })
		})

		await errorMiddleware(error, {} as any, mockRes as any, jest.fn())

		expect(setTag).toHaveBeenCalledWith('errorId', 'mock-error-id')
		expect(setUser).toHaveBeenCalledWith({})
	})
})
