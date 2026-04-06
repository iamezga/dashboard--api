import * as Sentry from '@sentry/node'
import { NextFunction, Request, Response } from 'express'
import { getContainer } from '../../core/dependencyContainer'
import {
	BadRequestError,
	ForbiddenError,
	HttpStatusCode,
	TooManyRequestsError,
	UnauthorizedError
} from '../../errors'
import { Job } from '../../lib/Job'
import { config } from '../../services/config'
import logger from '../../services/logger'
import { errorMiddleware } from './errorMiddleware'

// ----------------- Mocks -----------------
const mockRequest = {} as Request
const mockNext = jest.fn() as NextFunction

const mockGetPublicUser = jest.fn().mockReturnValue({ id: 'mock-user-id' })
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
		locals: { job: jobMock }
	}
	return res as Response
}

// ----------------- Module Mocks -----------------
jest.mock('@/lib/Job', () => ({ Job: jest.fn(() => mockJob) }))
jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn()
}))
jest.mock('@/services/config', () => ({
	config: { get: jest.fn() }
}))
jest.mock('crypto', () => ({ randomUUID: jest.fn(() => 'mock-error-id') }))
jest.mock('@sentry/node', () => ({
	withScope: jest.fn(),
	captureException: jest.fn()
}))
jest.mock('@/core/dependencyContainer', () => ({
	getContainer: jest.fn()
}))

// ----------------- Tests -----------------
describe('errorMiddleware', () => {
	let mockRes: Response
	let mockAuditRecord: jest.Mock

	beforeEach(() => {
		mockRes = createMockResponse(mockJob)
		jest.clearAllMocks()
		mockAuditRecord = jest.fn().mockResolvedValue(undefined)
		;(getContainer as jest.Mock).mockReturnValue({
			services: {
				auditService: {
					record: mockAuditRecord
				}
			}
		})
		;(config.get as jest.Mock) = jest.fn().mockImplementation((key: string) => {
			if (key === 'env') return 'development'
			if (key === 'sentry.dsn') return 'http://mock-sentry-dsn.com'
			return null
		})
		;(Sentry.withScope as jest.Mock).mockImplementation(cb => {
			const scope = {
				setTag: jest.fn(),
				setUser: jest.fn(),
				setExtra: jest.fn()
			}
			cb(scope)
		})
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
		expect(mockJobLogger.warn).toHaveBeenCalled()
	})

	it('should handle generic Error with 500 in development and Sentry', async () => {
		const error = new Error('Dev error')
		error.stack = 'mock-stack'
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.INTERNAL_SERVER_ERROR,
				name: 'InternalServerError',
				message: 'Dev error',
				stack: 'mock-stack',
				errorId: 'mock-error-id'
			})
		)
		expect(Sentry.withScope).toHaveBeenCalled()
		expect(Sentry.captureException).toHaveBeenCalledWith(error)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.error).toHaveBeenCalled()
	})

	it('should handle missing job gracefully', async () => {
		const error = new Error('No job')
		mockRes = createMockResponse(undefined)
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockJob.markFailed).not.toHaveBeenCalled()
		expect(logger.error).toHaveBeenCalled()
	})

	it('should set user={} if job.getPublicUser returns undefined', async () => {
		mockJob.getPublicUser = jest.fn().mockReturnValue(undefined)
		const error = new Error('No user')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)
		expect(Sentry.withScope).toHaveBeenCalled()
	})

	it('should handle generic Error with empty message and still log error', async () => {
		const error = new Error('')
		error.stack = ''
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(
			HttpStatusCode.INTERNAL_SERVER_ERROR
		)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				message: 'An unexpected error has occurred.',
				name: 'InternalServerError',
				errorId: 'mock-error-id'
			})
		)
		// logInstance.error should be called with message fallback
		expect(mockJobLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				message: '',
				errorId: 'mock-error-id'
			}),
			'An unexpected error has occurred.'
		)
		expect(mockAuditRecord).toHaveBeenCalledWith(
			'endpoint.execution.failed',
			mockJob,
			'endpoint',
			expect.any(String),
			expect.objectContaining({
				statusCode: HttpStatusCode.INTERNAL_SERVER_ERROR,
				errorId: 'mock-error-id'
			}),
			undefined,
			expect.objectContaining({
				category: 'security',
				severity: 'critical',
				result: expect.objectContaining({ status: 'failed' })
			})
		)
	})

	it('should not assign stack in production environment', async () => {
		;(config.get as jest.Mock).mockImplementation(key => {
			if (key === 'env') return 'production'
			if (key === 'sentry.dsn') return 'dsn'
			return null
		})
		const error = new Error('Production error')
		error.stack = 'stack'
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.json).toHaveBeenCalledWith(
			expect.not.objectContaining({ stack: 'stack' })
		)
	})

	it('should log with fallback message when err.message is undefined', async () => {
		const error = {} as Error // not instance of Error with message
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockJobLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({
				errorId: 'mock-error-id'
			}),
			'An unexpected error has occurred.'
		)
	})

	it('should handle BadRequestError without errors property', async () => {
		const error = new BadRequestError(
			'Bad request without validation errors',
			undefined as any
		)
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(HttpStatusCode.BAD_REQUEST)
		expect(mockRes.json).toHaveBeenCalledWith(
			expect.objectContaining({
				status: 'error',
				code: HttpStatusCode.BAD_REQUEST,
				name: 'BadRequestError',
				message: 'Bad request without validation errors',
				errorId: 'mock-error-id'
			})
		)
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.warn).toHaveBeenCalled()
	})

	it('should not call Sentry if sentry.dsn is not configured', async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'env') return 'development'
			if (key === 'sentry.dsn') return null
			return null
		})

		const error = new Error('Error without Sentry')
		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		// Sentry should not be called
		expect(Sentry.withScope).not.toHaveBeenCalled()
		expect(Sentry.captureException).not.toHaveBeenCalled()

		// Job logging and response still works
		expect(mockJob.markFailed).toHaveBeenCalledWith('mock-error-id', error)
		expect(mockJobLogger.error).toHaveBeenCalledWith(
			expect.objectContaining({ errorId: 'mock-error-id' }),
			expect.any(String)
		)
	})

	it('should emit unauthorized access security audit for UnauthorizedError', async () => {
		const error = new UnauthorizedError('Auth failed')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockAuditRecord).toHaveBeenCalledWith(
			'security.unauthorized_access',
			mockJob,
			'endpoint',
			expect.any(String),
			expect.objectContaining({
				statusCode: HttpStatusCode.UNAUTHORIZED
			}),
			undefined,
			expect.objectContaining({
				category: 'security',
				severity: 'warning',
				result: expect.objectContaining({ status: 'denied' })
			})
		)
	})

	it('should emit forbidden access security audit for ForbiddenError', async () => {
		const error = new ForbiddenError('Forbidden')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockAuditRecord).toHaveBeenCalledWith(
			'security.forbidden_access',
			mockJob,
			'endpoint',
			expect.any(String),
			expect.objectContaining({
				statusCode: HttpStatusCode.FORBIDDEN
			}),
			undefined,
			expect.objectContaining({
				category: 'security',
				severity: 'warning',
				result: expect.objectContaining({ status: 'denied' })
			})
		)
	})

	it('should emit rate-limit security audit for TooManyRequestsError', async () => {
		const error = new TooManyRequestsError('Too many requests')

		await errorMiddleware(error, mockRequest, mockRes, mockNext)

		expect(mockAuditRecord).toHaveBeenCalledWith(
			'security.rate_limit.triggered',
			mockJob,
			'endpoint',
			expect.any(String),
			expect.objectContaining({
				statusCode: HttpStatusCode.TOO_MANY_REQUESTS
			}),
			undefined,
			expect.objectContaining({
				category: 'security',
				severity: 'warning',
				result: expect.objectContaining({ status: 'denied' })
			})
		)
	})
})
