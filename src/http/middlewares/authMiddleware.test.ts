import { Request, Response } from 'express'
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken'
import { getContainer } from '../../core/dependencyContainer'
import { UnauthorizedError } from '../../errors'
import { authMiddleware } from './authMiddleware'

jest.mock('@/core/dependencyContainer', () => ({
	getContainer: jest.fn()
}))

describe('authMiddleware', () => {
	let req: Partial<Request & { requestData?: any }>
	let res: Partial<Response>
	let next: jest.Mock
	let jobMock: any
	let sessionRepo: any
	let userRepo: any
	let container: any

	beforeEach(() => {
		req = { headers: {}, requestData: { token: 'valid.token' } }
		jobMock = { setUser: jest.fn(), updateMeta: jest.fn() }
		res = { locals: { job: jobMock } }
		next = jest.fn()

		sessionRepo = {
			getSessionMetadata: jest.fn(),
			getSessionContext: jest.fn(),
			deleteSession: jest.fn(),
			deleteAllUserSessions: jest.fn(),
			updateLastActivity: jest.fn()
		}

		userRepo = {
			findStatusById: jest.fn()
		}

		container = {
			config: { get: jest.fn().mockReturnValue('secret') },
			libs: {
				jwt: { verify: jest.fn(() => ({ userId: 'u1', sessionId: 's1' })) }
			},
			repositoryManager: {
				get: (name: string) => (name === 'session' ? sessionRepo : userRepo)
			}
		}
		;(getContainer as jest.Mock).mockReturnValue(container)
	})

	it('should call next with error when requestData or job is missing', async () => {
		req.requestData = undefined
		res.locals = {} as any

		await authMiddleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringMatching(/must run before/)
			})
		)
	})

	it('should call next with UnauthorizedError when token is missing', async () => {
		req.requestData = { token: undefined }
		req.headers = {}

		await authMiddleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should call next with UnauthorizedError when sessionMetadata is missing', async () => {
		sessionRepo.getSessionMetadata.mockResolvedValue(null)

		await authMiddleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should extract token from Authorization header when requestData.token is missing', async () => {
		req.requestData = { token: 'header.token' }
		req.headers = {}

		sessionRepo.getSessionMetadata.mockResolvedValue({
			sessionId: 's1',
			userId: 'u1',
			lastActivity: Date.now(),
			maxInactiveTime: 60 * 60,
			sessionStartTime: Date.now(),
			maxSessionTime: 60 * 60
		})
		sessionRepo.getSessionContext.mockResolvedValue({
			user: {
				id: 'u1',
				email: 'user@example.com',
				name: 'FromHeader',
				surname: 'Test',
				status: 'active',
				config: {}
			},
			memberships: [],
			activeMembership: null
		})
		userRepo.findStatusById.mockResolvedValue({
			status: 'active',
			config: {},
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		})
		sessionRepo.updateLastActivity.mockResolvedValue(true)

		await authMiddleware(req as Request, res as Response, next)

		expect(container.libs.jwt.verify).toHaveBeenCalledWith(
			'header.token',
			'secret'
		)
		expect(jobMock.setUser).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'u1', name: 'FromHeader' })
		)
		expect(next).toHaveBeenCalledWith()
	})

	it('should call next with UnauthorizedError and delete session when session is expired or inactive', async () => {
		sessionRepo.getSessionMetadata.mockResolvedValue({
			sessionId: 's1',
			userId: 'u1',
			lastActivity: Date.now() - 9999999,
			maxInactiveTime: 1,
			sessionStartTime: Date.now() - 9999999,
			maxSessionTime: 1
		})

		await authMiddleware(req as Request, res as Response, next)

		expect(sessionRepo.deleteSession).toHaveBeenCalledWith('s1')
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should call next with UnauthorizedError and delete all sessions when user data is missing', async () => {
		sessionRepo.getSessionMetadata.mockResolvedValue({
			sessionId: 's1',
			userId: 'u1',
			lastActivity: Date.now(),
			maxInactiveTime: 60,
			sessionStartTime: Date.now(),
			maxSessionTime: 60
		})
		sessionRepo.getSessionContext.mockResolvedValue(null)

		await authMiddleware(req as Request, res as Response, next)

		expect(sessionRepo.deleteSession).toHaveBeenCalledWith('s1')
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should call next with UnauthorizedError and delete all sessions when user status is invalid', async () => {
		sessionRepo.getSessionMetadata.mockResolvedValue({
			sessionId: 's1',
			userId: 'u1',
			lastActivity: Date.now(),
			maxInactiveTime: 60,
			sessionStartTime: Date.now(),
			maxSessionTime: 60
		})
		sessionRepo.getSessionContext.mockResolvedValue({
			user: {
				id: 'u1',
				email: 'user@example.com',
				name: 'Name',
				surname: 'Test',
				status: 'active',
				config: {}
			},
			memberships: [],
			activeMembership: null
		})
		userRepo.findStatusById.mockResolvedValue(null)

		await authMiddleware(req as Request, res as Response, next)

		expect(sessionRepo.deleteAllUserSessions).toHaveBeenCalledWith('u1')
		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should set user in job, refresh last activity, and call next when authentication succeeds', async () => {
		sessionRepo.getSessionMetadata.mockResolvedValue({
			sessionId: 's1',
			userId: 'u1',
			lastActivity: Date.now(),
			maxInactiveTime: 60 * 60,
			sessionStartTime: Date.now(),
			maxSessionTime: 60 * 60
		})
		sessionRepo.getSessionContext.mockResolvedValue({
			user: {
				id: 'u1',
				email: 'user@example.com',
				name: 'Name',
				surname: 'Test',
				status: 'active',
				config: {}
			},
			memberships: [],
			activeMembership: null
		})
		userRepo.findStatusById.mockResolvedValue({
			status: 'active',
			config: {},
			lastLogin: null,
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		})
		sessionRepo.updateLastActivity.mockResolvedValue(true)

		await authMiddleware(req as Request, res as Response, next)

		expect(jobMock.setUser).toHaveBeenCalledWith(
			expect.objectContaining({ id: 'u1', name: 'Name', status: 'active' })
		)
		expect(sessionRepo.updateLastActivity).toHaveBeenCalledWith('s1', 60 * 60)
		expect(next).toHaveBeenCalledWith()
	})

	it('should call next with UnauthorizedError when token is expired', async () => {
		container.libs.jwt.verify.mockImplementation(() => {
			throw new TokenExpiredError('expired', new Date())
		})

		await authMiddleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})

	it('should call next with UnauthorizedError when token is invalid', async () => {
		container.libs.jwt.verify.mockImplementation(() => {
			throw new JsonWebTokenError('invalid')
		})

		await authMiddleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalledWith(expect.any(UnauthorizedError))
	})
})
