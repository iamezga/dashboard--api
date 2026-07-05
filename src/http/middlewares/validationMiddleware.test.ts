import { vi } from 'vitest'
// Mock all dependencies before importing the middleware
vi.mock('@/modules', () => ({ rules: {} }))
vi.mock('@/services/validationService', () => ({
	validator: { validate: vi.fn() }
}))
vi.mock('@/services/logger', () => ({
	info: vi.fn(),
	error: vi.fn(),
	warn: vi.fn()
}))
vi.mock('@/core/dependencyContainer', () => ({
	getContainer: vi.fn(() => ({}))
}))

import { BadRequestError, UnauthorizedError } from '@/errors'
import { rules } from '@/modules'
import { validator } from '@/services/validationService'
import { NextFunction, Request, Response } from 'express'
import { validationMiddleware } from './validationMiddleware'

describe('validationMiddleware', () => {
	let mockReq: Partial<Request>
	let mockRes: Partial<Response>
	let mockNext: ReturnType<typeof vi.fn>
	let mockJob: any

	beforeEach(() => {
		vi.clearAllMocks()
		vi.resetModules()

		mockJob = {
			getUser: vi.fn().mockReturnValue({ id: 'user1' }),
			getAttempts: vi.fn().mockReturnValue(1),
			getData: vi.fn().mockReturnValue({ foo: 'bar' }),
			getRecaptchaResponse: vi.fn().mockReturnValue('token'),
			getMeta: vi.fn().mockReturnValue({}),
			setData: vi.fn()
		}

		mockReq = {}
		mockRes = { locals: {} } as Partial<Response>
		mockNext = vi.fn()
	})

	it('should error if job is missing', async () => {
		const middleware = validationMiddleware('someRule' as any)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)
		expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'ValidationMiddleware: `jobMiddleware` must be run before `validationMiddleware`.'
		)
	})

	it('should error if rules for useCaseRuleName are missing', async () => {
		;(mockRes.locals as any).job = mockJob
		const middleware = validationMiddleware('missingRule' as any)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)
		expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'ValidationMiddleware: Validation rules for use case "missingRule" not found.'
		)
	})

	it('should throw UnauthorizedError if user validation fails', async () => {
		;(rules as any).testRule = { user: { id: 'string' } }
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)

		expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should throw BadRequestError if attempts validation fails', async () => {
		;(rules as any).testRule = { attempts: { attempts: 'number' } }
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'Attempts Validation failed'
		)
	})

	it('should throw BadRequestError if data validation fails', async () => {
		;(rules as any).testRule = { data: { foo: 'string' } }
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'Data Validation failed'
		)
	})

	it('should throw BadRequestError if recaptcha validation fails', async () => {
		;(rules as any).testRule = {
			recaptchaResponse: { recaptchaResponse: 'string' }
		}
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'Recaptcha Validation failed'
		)
	})

	it('should call next with no error if all validations pass', async () => {
		;(rules as any).testRule = {
			user: {},
			attempts: {},
			data: {},
			recaptchaResponse: {}
		}
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValue([])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)

		expect(mockNext).toHaveBeenCalledWith()
	})

	it('should throw UnauthorizedError if getUser() returns undefined and user validation fails', async () => {
		;(rules as any).testRule = { user: {} }
		mockJob.getUser.mockReturnValue(undefined)
		mockJob.getMeta.mockReturnValue({})
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{}
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware({} as any, mockRes as any, mockNext as NextFunction)

		expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect(mockNext.mock.calls[0][0].message).toBe('User Validation failed.')
	})

	it('should throw BadRequestError if recaptchaResponse validation fails', async () => {
		;(rules as any).testRule = { recaptchaResponse: {} }
		mockJob.getRecaptchaResponse.mockReturnValue('invalid-token')
		mockJob.getMeta.mockReturnValue({})
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{}
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware({} as any, mockRes as any, mockNext as NextFunction)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toBe(
			'Recaptcha Validation failed.'
		)
	})

	it('should throw BadRequestError if recaptchaResponse validation fails (getRecaptchaResponse return undefined)', async () => {
		;(rules as any).testRule = { recaptchaResponse: {} }
		mockJob.getRecaptchaResponse.mockReturnValue(undefined)
		mockJob.getMeta.mockReturnValue({})
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
			{}
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware({} as any, mockRes as any, mockNext as NextFunction)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toBe(
			'Recaptcha Validation failed.'
		)
	})

	it('should skip recaptcha validation if rule not present', async () => {
		;(rules as any).testRule = { user: {} } // no recaptchaResponse
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as ReturnType<typeof vi.fn>).mockResolvedValue([])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(
			mockReq as Request,
			mockRes as Response,
			mockNext as NextFunction
		)

		expect(validator.validate).toHaveBeenCalledTimes(1)
		expect(mockNext).toHaveBeenCalledWith()
	})
})
