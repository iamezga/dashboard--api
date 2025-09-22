import { NextFunction, Request, Response } from 'express'
import { TooManyRequestsError } from '../../errors'
import { providerManager } from '../../infrastructure/providerManager'
import { Job } from '../../lib/Job'
import { rateLimiterMiddleware } from './rateLimiterMiddleware'

let consumeMock: jest.Mock

// Mock de RateLimiterRedis
jest.mock('rate-limiter-flexible', () => {
	return {
		RateLimiterRedis: jest.fn().mockImplementation(() => ({
			consume: (...args: any[]) => consumeMock(...args)
		}))
	}
})

// Mock de providerManager
jest.mock('@/infrastructure/providerManager', () => ({
	providerManager: {
		get: jest.fn()
	}
}))

// Helper para crear req/res/next
const makeReqResNext = (withJob = true, withUser = true) => {
	const req = {} as Request
	const job = new Job(<any>{})

	if (withUser) {
		job.setUser({ id: 'user-123' } as any)
	}

	job.getMeta = jest.fn(() => ({
		ip: '127.0.0.1',
		timestamp: Date.now(),
		method: 'GET',
		url: '/test'
	}))

	const res = {
		locals: withJob ? { job } : {},
		set: jest.fn()
	} as any as Response

	const next = jest.fn() as NextFunction

	return { req, res, next, job }
}

describe('rateLimiterMiddleware', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		consumeMock = jest.fn()
		;(providerManager.get as jest.Mock).mockReturnValue({}) // fake redis client
	})

	it('should allow request when under rate limit (with user)', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next } = makeReqResNext(true, true)

		consumeMock.mockResolvedValueOnce(true)

		await middleware(req, res, next)

		expect(consumeMock).toHaveBeenCalledWith('user-123', 1)
		expect(next).toHaveBeenCalledWith()
	})

	it('should allow request when under rate limit (with IP)', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next, job } = makeReqResNext(true, false)

		job.getPublicUser = jest.fn(() => undefined)
		consumeMock.mockResolvedValueOnce(true)

		await middleware(req, res, next)

		expect(consumeMock).toHaveBeenCalledWith('127.0.0.1', 1)
		expect(next).toHaveBeenCalledWith()
	})

	it('should set Retry-After and throw TooManyRequestsError when rate limit exceeded', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next } = makeReqResNext(true, true)

		consumeMock.mockRejectedValueOnce({ msBeforeNext: 5000 })

		await middleware(req, res, next)

		expect(res.set).toHaveBeenCalledWith('Retry-After', '5')
		expect(next).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
	})

	it('should throw TooManyRequestsError without Retry-After if error has no msBeforeNext', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next } = makeReqResNext(true, true)

		consumeMock.mockRejectedValueOnce(new Error('Other error'))

		await middleware(req, res, next)

		expect(res.set).not.toHaveBeenCalled()
		expect(next).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
	})

	it('should throw error if job is missing', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next } = makeReqResNext(false)

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith(expect.any(Error))
	})
})
