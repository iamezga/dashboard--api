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
		getSessionMetadata: jest.fn(),
		getUserData: jest.fn(),
		deleteSession: jest.fn(),
		deleteAllUserSessions: jest.fn(),
		updateLastActivity: jest.fn()
	}
	const userRepository = { findStatusById: jest.fn() }
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
			repositories: { user: userRepository, session: sessionRepository },
			config,
			logger
		} as any)

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should throw UnauthorizedError if no token and no valid Authorization header', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext(undefined)

		// ni requestData.token ni header válido
		;(req as any).headers = { authorization: 'Basic abc123' }

		await expect(middleware(req, res, next)).rejects.toThrow(
			'Authentication failed.'
		)
	})

	it('should throw if jwt.secret is missing', () => {
		const badConfig = { get: jest.fn(() => null) }
		const container = { ...makeContainer(), config: badConfig }
		expect(() => authMiddleware(container)).toThrow(
			'JWT configuration is missing in the environment.'
		)
	})

	it('should throw if jwt.expiresIn is missing', () => {
		const badConfig = {
			get: jest.fn((key: string) => (key === 'jwt.secret' ? 'secret' : null))
		}
		const container = { ...makeContainer(), config: badConfig }
		expect(() => authMiddleware(container)).toThrow(
			'JWT configuration is missing in the environment.'
		)
	})

	it('should call next with error if requestData is missing', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext()
		delete (req as any).requestData

		await expect(middleware(req, res, next)).rejects.toThrow(
			'Authentication failed.'
		)
	})

	it('should authenticate successfully with valid token and user', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next, job } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce({
			userId: 'u1',
			sessionStartTime: Date.now(),
			lastActivity: Date.now(),
			maxInactiveTime: 3600,
			maxSessionTime: 86400
		})
		sessionRepository.getUserData.mockResolvedValueOnce({
			id: 'u1',
			permissions: {}
		})
		userRepository.findStatusById.mockResolvedValueOnce(mockUserStatus)

		await middleware(req, res, next)

		expect(jwt.verify).toHaveBeenCalledWith('valid-token', 'secret')
		expect(sessionRepository.getSessionMetadata).toHaveBeenCalledWith('s1')
		expect(sessionRepository.getUserData).toHaveBeenCalledWith('u1')
		expect(userRepository.findStatusById).toHaveBeenCalledWith('u1')
		expect(job.getUser()).toMatchObject({ id: 'u1', active: true })
		expect(next).toHaveBeenCalledWith()
	})

	it('should call next with UnauthorizedError if session not found', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce(null)

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should delete session and throw UnauthorizedError if session is inactive', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce({
			userId: 'u1',
			sessionStartTime: Date.now(),
			lastActivity: Date.now() - 10_000_000, // too old
			maxInactiveTime: 1, // 1 second
			maxSessionTime: 86400
		})

		await middleware(req, res, next)

		expect(sessionRepository.deleteSession).toHaveBeenCalledWith('s1')
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should delete session and throw UnauthorizedError if session is expired', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce({
			userId: 'u1',
			sessionStartTime: Date.now() - 10_000_000,
			lastActivity: Date.now(),
			maxInactiveTime: 3600,
			maxSessionTime: 1 // 1 second
		})

		await middleware(req, res, next)

		expect(sessionRepository.deleteSession).toHaveBeenCalledWith('s1')
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should delete all sessions if user data not found', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce({
			userId: 'u1',
			sessionStartTime: Date.now(),
			lastActivity: Date.now(),
			maxInactiveTime: 3600,
			maxSessionTime: 86400
		})
		sessionRepository.getUserData.mockResolvedValueOnce(null)

		await middleware(req, res, next)

		expect(sessionRepository.deleteAllUserSessions).toHaveBeenCalledWith('u1')
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should delete all sessions if user is inactive', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext('valid-token')

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce({
			userId: 'u1',
			sessionStartTime: Date.now(),
			lastActivity: Date.now(),
			maxInactiveTime: 3600,
			maxSessionTime: 86400
		})
		sessionRepository.getUserData.mockResolvedValueOnce({
			id: 'u1',
			permissions: {}
		})
		userRepository.findStatusById.mockResolvedValueOnce({
			...mockUserStatus,
			active: false
		})

		await middleware(req, res, next)

		expect(sessionRepository.deleteAllUserSessions).toHaveBeenCalledWith('u1')
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

	it('should extract token from Authorization header when requestData.token is missing', async () => {
		const container = makeContainer()
		const middleware = authMiddleware(container)
		const { req, res, next } = makeReqResNext(undefined)

		;(req as any).headers = { authorization: 'Bearer header-token' }

		jwt.verify.mockReturnValueOnce({ userId: 'u1', sessionId: 's1' })
		sessionRepository.getSessionMetadata.mockResolvedValueOnce({
			userId: 'u1',
			sessionStartTime: Date.now(),
			lastActivity: Date.now(),
			maxInactiveTime: 3600,
			maxSessionTime: 86400
		})
		sessionRepository.getUserData.mockResolvedValueOnce({
			id: 'u1',
			permissions: {}
		})
		userRepository.findStatusById.mockResolvedValueOnce(mockUserStatus)

		await middleware(req, res, next)

		expect(jwt.verify).toHaveBeenCalledWith('header-token', 'secret')
		expect(next).toHaveBeenCalledWith()
	})

	it('should log and wrap unexpected errors', async () => {
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

	it('should log unexpected object values by stringifying them', async () => {
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
