import { NextFunction, Request, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { UnauthorizedError } from '../../errors'
import { Job } from '../../lib/Job'
import { authMiddleware } from './authMiddleware'

const mockUserStatus = {
	id: 'u1',
	active: true,
	deletedAt: null,
	config: {},
	createdAt: new Date(),
	updatedAt: new Date()
}

const mockSession = {
	user: {
		id: 'u1',
		email: 'test@mail.com'
	},
	permissions: ['read'],
	lastActivity: Date.now(),
	sessionStartTime: Date.now(),
	maxInactiveTime: '1h',
	maxSessionTime: '2h'
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
	const sessionRepository = {
		findById: jest.fn(),
		delete: jest.fn(),
		updateLastActivity: jest.fn()
	}
	const userRepository = { findStatusById: jest.fn() }
	const logger = { error: jest.fn() }
	const ms = jest.fn(() => 1000) // dummy conversion
	const config = {
		get: jest.fn((key: string) => {
			if (key === 'jwt.secret') return 'secret'
			if (key === 'jwt.expiresIn') return '1h'
			return null
		})
	}

	const makeContainer = () =>
		({
			thirdParties: { jwt, ms },
			repositories: { user: userRepository, session: sessionRepository },
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
		sessionRepository.findById.mockResolvedValueOnce(mockSession)
		userRepository.findStatusById.mockResolvedValueOnce(mockUserStatus)

		await middleware(req, res, next)

		expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'secret')
		expect(sessionRepository.findById).toHaveBeenCalledWith('u1')
		expect(userRepository.findStatusById).toHaveBeenCalledWith('u1')
		expect(job.getUser()).toMatchObject({ id: 'u1', active: true })
		expect(next).toHaveBeenCalledWith()
	})

	it('should call next with UnauthorizedError if session not found', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })
		sessionRepository.findById.mockResolvedValueOnce(null)

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

	it('should delete session and throw UnauthorizedError if session is inactive', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })

		const oldSession = {
			...mockSession,
			lastActivity: Date.now() - 10000000,
			sessionStartTime: Date.now()
		}
		sessionRepository.findById.mockResolvedValueOnce(oldSession)

		await middleware(req, res, next)

		expect(sessionRepository.delete).toHaveBeenCalledWith('u1')
		const errorArg = (next as jest.Mock).mock.calls[0][0]
		expect(errorArg).toBeInstanceOf(UnauthorizedError)
		expect(errorArg.message).toBe(
			'Authentication failed: Session expired due to inactivity.'
		)
	})

	it('should delete session and throw UnauthorizedError if session is expired by maxSessionTime', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })

		const expiredSession = {
			...mockSession,
			lastActivity: Date.now(),
			sessionStartTime: Date.now() - 10000000
		}
		sessionRepository.findById.mockResolvedValueOnce(expiredSession)

		await middleware(req, res, next)

		expect(sessionRepository.delete).toHaveBeenCalledWith('u1')
		const errorArg = (next as jest.Mock).mock.calls[0][0]
		expect(errorArg).toBeInstanceOf(UnauthorizedError)
		expect(errorArg.message).toBe(
			'Authentication failed: Session expired due to inactivity.'
		)
	})

	it('should delete session and throw UnauthorizedError if user is inactive', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })
		sessionRepository.findById.mockResolvedValueOnce(mockSession)

		userRepository.findStatusById.mockResolvedValueOnce({
			...mockUserStatus,
			active: false
		})

		await middleware(req, res, next)

		expect(sessionRepository.delete).toHaveBeenCalledWith('u1')
		const errorArg = (next as jest.Mock).mock.calls[0][0]
		expect(errorArg).toBeInstanceOf(UnauthorizedError)
		expect(errorArg.message).toBe(
			'Authentication failed: User is inactive or not found.'
		)
	})

	it('should delete session and throw UnauthorizedError if user is deleted', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })
		sessionRepository.findById.mockResolvedValueOnce(mockSession)

		userRepository.findStatusById.mockResolvedValueOnce({
			...mockUserStatus,
			deletedAt: new Date()
		})

		await middleware(req, res, next)

		expect(sessionRepository.delete).toHaveBeenCalledWith('u1')
		const errorArg = (next as jest.Mock).mock.calls[0][0]
		expect(errorArg).toBeInstanceOf(UnauthorizedError)
		expect(errorArg.message).toBe(
			'Authentication failed: User is inactive or not found.'
		)
	})
	it('should throw UnauthorizedError if no token and no Authorization header', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext(undefined)

		;(req as any).headers = {}

		await expect(middleware(req, res, next)).rejects.toThrow(
			'No authentication token provided or token malformed.'
		)
	})

	it('should throw UnauthorizedError if Authorization header does not start with Bearer', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext(undefined)

		;(req as any).headers = { authorization: 'Basic abc123' }

		await expect(middleware(req, res, next)).rejects.toThrow(
			'No authentication token provided or token malformed.'
		)
	})

	it('should throw if job is missing in res.locals', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		res.locals = {}

		await expect(middleware(req, res, next)).rejects.toThrow(
			'`jobMiddleware` must be run before `authMiddleware`.'
		)
	})

	it('should extract token from Authorization header when requestData.token is missing', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next, job } = makeReqResNext(undefined)

		;(req as any).headers = { authorization: 'Bearer header-token' }

		jwt.verify.mockReturnValueOnce({ userId: 'u1' })

		container.repositories.session = {
			findById: jest.fn().mockResolvedValue({
				user: { id: 'u1', email: 'test@mail.com' },
				permissions: {},
				lastActivity: Date.now(),
				sessionStartTime: Date.now(),
				maxInactiveTime: '10m',
				maxSessionTime: '1h'
			}),
			updateLastActivity: jest.fn(),
			delete: jest.fn()
		}
		container.repositories.user = {
			findStatusById: jest.fn().mockResolvedValue({
				id: 'u1',
				active: true,
				config: {},
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			})
		}
		container.thirdParties.ms = (str: string) =>
			str.includes('m') ? 600000 : 3600000 // mock ms converter

		await middleware(req, res, next)

		expect(jwt.verify).toHaveBeenCalledWith('header-token', 'secret')
		expect(job.getUser()).toHaveProperty('id', 'u1')
		expect(next).toHaveBeenCalledWith()
	})

	it('should log and wrap unexpected non-Error values', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockImplementationOnce(() => {
			throw 'non-error value'
		})

		await middleware(req, res, next)

		expect(logger.error).toHaveBeenCalledWith(
			expect.stringContaining(
				'AuthMiddleware unexpected error: non-error value'
			)
		)
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})
})
