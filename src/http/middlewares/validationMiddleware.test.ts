// Mock all dependencies before importing the middleware
jest.mock('@/modules', () => ({ rules: {} }))
jest.mock('@/services/validationService', () => ({
	validator: { validate: jest.fn() }
}))
jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn()
}))
jest.mock('@/core/dependencyContainer', () => ({
	getContainer: jest.fn(() => ({}))
}))

import { Request, Response } from 'express'
import { BadRequestError, UnauthorizedError } from '../../errors'
import { rules } from '../../modules'
import { validator } from '../../services/validationService'
import { validationMiddleware } from './validationMiddleware'

describe('validationMiddleware', () => {
	let mockReq: Partial<Request>
	let mockRes: Partial<Response>
	let mockNext: jest.Mock
	let mockJob: any

	beforeEach(() => {
		jest.clearAllMocks()
		jest.resetModules()

		mockJob = {
			getUser: jest.fn().mockReturnValue({ id: 'user1' }),
			getAttempts: jest.fn().mockReturnValue(1),
			getData: jest.fn().mockReturnValue({ foo: 'bar' }),
			getRecaptchaResponse: jest.fn().mockReturnValue('token'),
			getMeta: jest.fn().mockReturnValue({}),
			setData: jest.fn()
		}

		mockReq = {}
		mockRes = { locals: {} } as Partial<Response>
		mockNext = jest.fn()
	})

	it('should error if job is missing', async () => {
		const middleware = validationMiddleware('someRule' as any)
		await middleware(mockReq as Request, mockRes as Response, mockNext)
		expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'ValidationMiddleware: `jobMiddleware` must be run before `validationMiddleware`.'
		)
	})

	it('should error if rules for useCaseRuleName are missing', async () => {
		;(mockRes.locals as any).job = mockJob
		const middleware = validationMiddleware('missingRule' as any)
		await middleware(mockReq as Request, mockRes as Response, mockNext)
		expect(mockNext).toHaveBeenCalledWith(expect.any(Error))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'ValidationMiddleware: Validation rules for use case "missingRule" not found.'
		)
	})

	it('should throw UnauthorizedError if user validation fails', async () => {
		;(rules as any).testRule = { user: { id: 'string' } }
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as jest.Mock).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should throw BadRequestError if attempts validation fails', async () => {
		;(rules as any).testRule = { attempts: { attempts: 'number' } }
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as jest.Mock).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toContain(
			'Attempts Validation failed'
		)
	})

	it('should throw BadRequestError if data validation fails', async () => {
		;(rules as any).testRule = { data: { foo: 'string' } }
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as jest.Mock).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

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
		;(validator.validate as jest.Mock).mockResolvedValueOnce([
			{ type: 'error' }
		])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

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
		;(validator.validate as jest.Mock).mockResolvedValue([])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockNext).toHaveBeenCalledWith()
	})

	it('should throw UnauthorizedError if getUser() returns undefined and user validation fails', async () => {
		;(rules as any).testRule = { user: {} }
		mockJob.getUser.mockReturnValue(undefined)
		mockJob.getMeta.mockReturnValue({})
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as jest.Mock).mockResolvedValueOnce([{}])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware({} as any, mockRes as any, mockNext)

		expect(mockNext).toHaveBeenCalledWith(expect.any(UnauthorizedError))
		expect(mockNext.mock.calls[0][0].message).toBe('User Validation failed.')
	})

	it('should throw BadRequestError if recaptchaResponse validation fails', async () => {
		;(rules as any).testRule = { recaptchaResponse: {} }
		mockJob.getRecaptchaResponse.mockReturnValue('invalid-token')
		mockJob.getMeta.mockReturnValue({})
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as jest.Mock).mockResolvedValueOnce([{}])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware({} as any, mockRes as any, mockNext)

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
		;(validator.validate as jest.Mock).mockResolvedValueOnce([{}])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware({} as any, mockRes as any, mockNext)

		expect(mockNext).toHaveBeenCalledWith(expect.any(BadRequestError))
		expect(mockNext.mock.calls[0][0].message).toBe(
			'Recaptcha Validation failed.'
		)
	})

	it('should skip recaptcha validation if rule not present', async () => {
		;(rules as any).testRule = { user: {} } // no recaptchaResponse
		;(mockRes.locals as any).job = mockJob
		;(validator.validate as jest.Mock).mockResolvedValue([])

		const middleware = validationMiddleware('testRule' as keyof typeof rules)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(validator.validate).toHaveBeenCalledTimes(1)
		expect(mockNext).toHaveBeenCalledWith()
	})
})
