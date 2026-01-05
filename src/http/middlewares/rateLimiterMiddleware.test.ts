import { NextFunction, Request, Response } from 'express'
import { TooManyRequestsError } from '../../errors'
import { databaseManager } from '../../infrastructure/databaseManager'
import { Job } from '../../lib/Job'
import logger from '../../services/logger'
import { RATE_LIMITS, rateLimiterMiddleware } from './rateLimiterMiddleware'

let consumeMock: jest.Mock

// Mock de RateLimiterRedis
jest.mock('rate-limiter-flexible', () => {
	return {
		RateLimiterRedis: jest.fn().mockImplementation(() => ({
			consume: (...args: any[]) => consumeMock(...args)
		}))
	}
})

// Mock de databaseManager
jest.mock('@/infrastructure/databaseManager', () => ({
	databaseManager: {
		get: jest.fn()
	}
}))

// Mock de logger
jest.mock('@/services/logger', () => ({
	__esModule: true,
	default: {
		warn: jest.fn(),
		info: jest.fn(),
		error: jest.fn(),
		debug: jest.fn()
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

describe('RATE_LIMITS configuration', () => {
	it('should export strict rate limit config', () => {
		expect(RATE_LIMITS.strict).toEqual({
			points: 3,
			duration: 60,
			blockDuration: 300
		})
	})

	it('should export moderate rate limit config', () => {
		expect(RATE_LIMITS.moderate).toEqual({
			points: 10,
			duration: 60,
			blockDuration: 60
		})
	})

	it('should export permissive rate limit config', () => {
		expect(RATE_LIMITS.permissive).toEqual({
			points: 30,
			duration: 60,
			blockDuration: 0
		})
	})
})

describe('rateLimiterMiddleware', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		consumeMock = jest.fn()
		;(databaseManager.get as jest.Mock).mockReturnValue({}) // fake redis client
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

	it('should set Retry-After, log warning, and throw TooManyRequestsError when rate limit exceeded (with user)', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next } = makeReqResNext(true, true)

		consumeMock.mockRejectedValueOnce({ msBeforeNext: 5000 })

		await middleware(req, res, next)

		expect(res.set).toHaveBeenCalledWith('Retry-After', '5')
		expect(logger.warn).toHaveBeenCalledWith(
			'Rate limit exceeded for user: user-123. Retry after 5s (5 requests per 10s)'
		)
		expect(next).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
	})

	it('should set Retry-After, log warning with IP, and throw TooManyRequestsError when rate limit exceeded (with IP)', async () => {
		const middleware = rateLimiterMiddleware(3, 60)
		const { req, res, next, job } = makeReqResNext(true, false)

		job.getPublicUser = jest.fn(() => undefined)
		consumeMock.mockRejectedValueOnce({ msBeforeNext: 10000 })

		await middleware(req, res, next)

		expect(res.set).toHaveBeenCalledWith('Retry-After', '10')
		expect(logger.warn).toHaveBeenCalledWith(
			'Rate limit exceeded for IP: 127.0.0.1. Retry after 10s (3 requests per 60s)'
		)
		expect(next).toHaveBeenCalledWith(expect.any(TooManyRequestsError))
	})

	it('should use "unknown" as identifier when rate limit exceeded without user and without IP', async () => {
		const middleware = rateLimiterMiddleware(3, 60)
		const { req, res, next, job } = makeReqResNext(true, false)

		job.getPublicUser = jest.fn(() => undefined)
		job.getMeta = jest.fn(() => ({
			ip: undefined,
			timestamp: Date.now(),
			method: 'GET',
			url: '/test'
		}))
		consumeMock.mockRejectedValueOnce({ msBeforeNext: 10000 })

		await middleware(req, res, next)

		expect(res.set).toHaveBeenCalledWith('Retry-After', '10')
		expect(logger.warn).toHaveBeenCalledWith(
			'Rate limit exceeded for IP: unknown. Retry after 10s (3 requests per 60s)'
		)
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

		await expect(middleware(req, res, next)).rejects.toThrow(
			'RateLimiterMiddleware: `jobMiddleware` must be run before `rateLimiterMiddleware`.'
		)
	})

	it('should use default blockDuration of 0 when not provided', async () => {
		const middleware = rateLimiterMiddleware(5, 10)
		const { req, res, next } = makeReqResNext(true, true)

		consumeMock.mockResolvedValueOnce(true)

		await middleware(req, res, next)

		expect(next).toHaveBeenCalledWith()
	})
})
