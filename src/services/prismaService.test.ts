import { PrismaClient } from '@prisma/client'
import logger from './logger'
import { PrismaService } from './prismaService'

jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn()
}))

jest.mock('@prisma/client', () => {
	const mPrismaClient = {
		$connect: jest.fn(),
		$disconnect: jest.fn(),
		$on: jest.fn()
	}
	return {
		PrismaClient: jest.fn(() => mPrismaClient),
		Prisma: {}
	}
})

describe('PrismaService', () => {
	let service: PrismaService

	beforeEach(() => {
		service = new PrismaService({
			enabled: true,
			url: 'postgres://localhost',
			log: []
		} as any)
		jest.clearAllMocks()
		service.__resetForTests()
	})

	it('Should return null if service is disabled', async () => {
		service = new PrismaService({ enabled: false } as any)
		const client = await service.connect()
		expect(client).toBeNull()
		expect(logger.info).toHaveBeenCalledWith(
			'Prisma (PostgreSQL) is disabled in configuration. Skipping connection.'
		)
	})

	it('Should throw error if URL is not configured', async () => {
		service = new PrismaService({ enabled: true } as any)
		await expect(service.connect()).rejects.toThrow(
			'Prisma url is not configured.'
		)
		expect(logger.error).toHaveBeenCalledWith(
			'Prisma (PostgreSQL) URL is not configured.'
		)
	})

	it('Should connect successfully and register $on events', async () => {
		const mockClient = await service.connect()
		expect(mockClient).toBeDefined()
		expect(PrismaClient).toHaveBeenCalled()
		expect(mockClient!.$connect).toHaveBeenCalled()
		expect(mockClient!.$on).toHaveBeenCalledTimes(3) // error, info, warn
		expect(logger.info).toHaveBeenCalledWith(
			'Prisma (PostgreSQL) connected successfully.'
		)
	})

	it('Should return existing client if already connected', async () => {
		const firstClient = await service.connect()
		const secondClient = await service.connect()
		expect(secondClient).toBe(firstClient)
		expect(logger.info).toHaveBeenCalledWith(
			'Prisma (PostgreSQL) already initialized.'
		)
	})

	it('getClient should throw if not connected', () => {
		expect(() => service.getClient()).toThrow(
			'Prisma (PostgreSQL) not connected. Call connect() first.'
		)
	})

	it('getClient should return client if connected', async () => {
		const client = await service.connect()
		expect(service.getClient()).toBe(client)
	})

	it('disconnect should disconnect client and reset state', async () => {
		await service.connect()
		await service.disconnect()
		expect(service.getClient).toThrow()
		expect(logger.info).toHaveBeenCalledWith(
			'Prisma (PostgreSQL) disconnected.'
		)
	})

	it('disconnect should do nothing if client is not connected', async () => {
		await service.disconnect()
		expect(logger.info).not.toHaveBeenCalledWith(
			'Prisma (PostgreSQL) disconnected.'
		)
	})

	it('should reset internal state with __resetForTests', async () => {
		await service.connect()
		service.__resetForTests()
		expect(() => service.getClient()).toThrow()
	})

	it('Should call $on handlers correctly', async () => {
		const mockClient = await service.connect()
		const onSpy = mockClient!.$on as jest.Mock

		const errorHandler = onSpy.mock.calls.find(c => c[0] === 'error')![1]
		const infoHandler = onSpy.mock.calls.find(c => c[0] === 'info')![1]
		const warnHandler = onSpy.mock.calls.find(c => c[0] === 'warn')![1]

		const mockError = { message: 'prisma-error' } as any
		const mockInfo = { message: 'prisma-info' } as any
		const mockWarn = { message: 'prisma-warn' } as any

		errorHandler(mockError)
		infoHandler(mockInfo)
		warnHandler(mockWarn)

		expect(logger.error).toHaveBeenCalledWith('Prisma Error:', mockError)
		expect(logger.info).toHaveBeenCalledWith('Prisma Info:', mockInfo)
		expect(logger.warn).toHaveBeenCalledWith('Prisma Warn:', mockWarn)
	})

	it('Should log and throw if PrismaClient constructor or $connect fails', async () => {
		;(PrismaClient as jest.Mock).mockImplementationOnce(() => {
			throw new Error('constructor-fail')
		})

		const failingService = new PrismaService({
			enabled: true,
			url: 'postgres://localhost'
		} as any)

		await expect(failingService.connect()).rejects.toThrow('constructor-fail')
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to connect Prisma (PostgreSQL):',
			expect.any(Error)
		)
	})
})
