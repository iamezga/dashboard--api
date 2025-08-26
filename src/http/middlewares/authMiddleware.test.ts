import { NextFunction, Request, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { UnauthorizedError } from '../../errors'
import { Job } from '../../lib/Job'
import { authMiddleware } from './authMiddleware'

const mockUser = {
	id: 'u1',
	email: 'test@mail.com',
	active: true,
	deletedAt: null
}

const makeReqResNext = (token?: string) => {
	const req = {
		headers: token ? { authorization: `Bearer ${token}` } : {},
		requestData: token ? { token } : {}
	} as unknown as Request

	const job = new Job(<any>{}) // simulate an empty Job

	const res = {
		locals: { job }
	} as unknown as Response

	const next = jest.fn() as NextFunction

	return { req, res, next, job }
}

describe('authMiddleware', () => {
	const jwt = { verify: jest.fn() }
	const userRepository = { findById: jest.fn() }
	const logger = { error: jest.fn() }
	const config = {
		get: jest.fn((key: string) => {
			if (key === 'jwt.secret') return 'secret'
			if (key === 'jwt.expiresIn') return '1h'
			return null
		})
	}

	const makeContainer = () =>
		({
			thirdParties: { jwt },
			repositories: { user: userRepository },
			config,
			logger
		} as any)

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should throw if jwt.secret is missing', () => {
		const badConfig = { get: jest.fn(() => null) }
		const container = { ...makeContainer(), config: badConfig }
		expect(() => authMiddleware(container)).toThrow(
			'JWT_SECRET is not defined in the configuration.'
		)
	})

	it('should throw if jwt.expiresIn is missing', () => {
		const badConfig = {
			get: jest.fn((key: string) => (key === 'jwt.secret' ? 'secret' : null))
		}
		const container = { ...makeContainer(), config: badConfig }
		expect(() => authMiddleware(container)).toThrow(
			'JWT_EXPIRES_IN is not defined in the configuration.'
		)
	})

	it('should call next with error if requestData is missing', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext()
		delete (req as any).requestData

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
	})

	it('should authenticate successfully with valid token and user', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next, job } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })
		userRepository.findById.mockResolvedValueOnce(mockUser)

		await middleware(req, res, next)

		expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'secret')
		expect(userRepository.findById).toHaveBeenCalledWith('u1')
		expect(job.getUser()).toEqual(mockUser)
		expect(next).toHaveBeenCalledWith()
	})

	it('should call next with UnauthorizedError if user not found', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })
		userRepository.findById.mockResolvedValueOnce(null)

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should call next with UnauthorizedError if token expired', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('expired-token')

		jwt.verify.mockImplementationOnce(() => {
			throw new TokenExpiredError('Token expired', new Date())
		})

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should call next with UnauthorizedError if token malformed', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('bad-token')

		jwt.verify.mockImplementationOnce(() => {
			throw new JsonWebTokenError('Invalid signature')
		})

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should log and call next with UnauthorizedError on unexpected error', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockImplementationOnce(() => {
			throw new Error('Unexpected crash')
		})

		await middleware(req, res, next)

		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				'AuthMiddleware unexpected error: Unexpected crash'
			)
		)
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})
})
