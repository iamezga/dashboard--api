import { PrismaClient } from '@/generated/prisma/client'
import { Logger } from 'pino'
import { Mock, vi } from 'vitest'
import { Postgres } from './Postgres'

const mockLogger = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
} as unknown as Logger

vi.mock('@/services/logger', () => ({
	__esModule: true,
	default: mockLogger
}))

vi.mock('@/generated/prisma/client', function () {
	const mPrismaClient = {
		$connect: vi.fn(),
		$disconnect: vi.fn(),
		$on: vi.fn()
	}
	return {
		PrismaClient: vi.fn(function () {
			return mPrismaClient
		}),
		Prisma: {}
	}
})

describe('Postgres', () => {
	let service: Postgres

	beforeEach(() => {
		service = new Postgres({ url: 'postgres://localhost' } as any, mockLogger)
		vi.clearAllMocks()
		service.__resetForTests()
	})

	it('should throw if URL is not configured', async () => {
		service = new Postgres({} as any, mockLogger)
		await expect(service.connect()).rejects.toThrow(
			'PostgreSQL (Prisma) URL is not configured.'
		)
		expect(mockLogger.error).toHaveBeenCalledWith(
			'PostgreSQL (Prisma) URL is not configured.'
		)
	})

	it('should connect successfully and register $on events', async () => {
		const client = await service.connect()
		expect(client).toBeDefined()
		expect(PrismaClient).toHaveBeenCalled()
		expect(client.$connect).toHaveBeenCalled()
		expect(client.$on).toHaveBeenCalledTimes(3) // error, info, warn
		expect(mockLogger.info).toHaveBeenCalledWith(
			'PostgreSQL (Prisma) connected successfully.'
		)
	})

	it('should return existing client if already connected', async () => {
		const first = await service.connect()
		const second = await service.connect()
		expect(second).toBe(first)
		expect(mockLogger.info).toHaveBeenCalledWith(
			'PostgreSQL (Prisma) already connected.'
		)
	})

	it('should disconnect only if client exists', async () => {
		await service.connect()
		await service.disconnect()
		expect(service['client']).toBeNull()
		expect(mockLogger.info).toHaveBeenCalledWith(
			'PostgreSQL (Prisma) disconnected.'
		)

		// calling disconnect again does nothing
		await service.disconnect()
		expect(mockLogger.info).toHaveBeenCalledTimes(2)
	})

	it('should reset internal state for tests', async () => {
		await service.connect()
		service.__resetForTests()
		expect(service['client']).toBeNull()
	})

	it('should call $on handlers correctly', async () => {
		const client = await service.connect()
		const $on = client.$on as Mock

		const errorHandler = $on.mock.calls.find(c => c[0] === 'error')![1]
		const infoHandler = $on.mock.calls.find(c => c[0] === 'info')![1]
		const warnHandler = $on.mock.calls.find(c => c[0] === 'warn')![1]

		const err = { message: 'err' }
		const info = { message: 'info' }
		const warn = { message: 'warn' }

		errorHandler(err)
		infoHandler(info)
		warnHandler(warn)

		expect(mockLogger.error).toHaveBeenCalledWith(
			`Prisma Error: ${err.message}`
		)
		expect(mockLogger.info).toHaveBeenCalledWith(`Prisma Info: ${info.message}`)
		expect(mockLogger.warn).toHaveBeenCalledWith(`Prisma Warn: ${warn.message}`)
	})

	it('should log and throw if PrismaClient constructor or $connect fails', async () => {
		;(PrismaClient as Mock).mockImplementationOnce(function () {
			throw new Error('constructor-fail')
		})
		const failingService = new Postgres(
			{ url: 'postgres://localhost' } as any,
			mockLogger
		)
		await expect(failingService.connect()).rejects.toThrow('constructor-fail')
		expect(mockLogger.error).toHaveBeenCalledWith(
			'Failed to connect PostgreSQL (Prisma):',
			expect.any(Error)
		)
	})
})
