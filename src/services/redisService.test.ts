import { createClient } from 'redis'
import logger from './logger'
import { RedisService } from './redisService'

jest.mock('redis', () => ({
	createClient: jest.fn()
}))

jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}))

describe('RedisService', () => {
	let service: RedisService
	let mockClient: any

	beforeEach(() => {
		jest.clearAllMocks()

		mockClient = {
			connect: jest.fn(),
			quit: jest.fn(),
			on: jest.fn(),
			isReady: true
		}
		;(createClient as jest.Mock).mockReturnValue(mockClient)

		service = new RedisService({
			enabled: true,
			host: 'localhost',
			port: 6379,
			db: 0
		} as any)
	})

	it('should connect successfully and return the client', async () => {
		const client = await service.connect()
		expect(createClient).toHaveBeenCalledWith({
			url: 'redis://localhost:6379/0',
			password: undefined,
			socket: expect.objectContaining({
				reconnectStrategy: expect.any(Function)
			})
		})
		expect(mockClient.connect).toHaveBeenCalled()
		expect(client).toBe(mockClient)
		expect(logger.info).toHaveBeenCalledWith('Redis connected successfully.')
	})

	it('should return null if service is disabled', async () => {
		service = new RedisService({ enabled: false } as any)
		const client = await service.connect()
		expect(client).toBeNull()
		expect(logger.info).toHaveBeenCalledWith(
			'Redis is disabled. Skipping connection.'
		)
	})

	it('should return existing client if already connected', async () => {
		await service.connect()
		const client2 = await service.connect()
		expect(logger.info).toHaveBeenCalledWith('Redis client already connected.')
		expect(client2).toBe(mockClient)
	})

	it('should register events and call logger correctly', async () => {
		await service.connect()
		const onCalls = mockClient.on.mock.calls
		const errorHandler = onCalls.find((c: string[]) => c[0] === 'error')![1]
		const connectHandler = onCalls.find((c: string[]) => c[0] === 'connect')![1]
		const reconnectHandler = onCalls.find(
			(c: string[]) => c[0] === 'reconnecting'
		)![1]
		const endHandler = onCalls.find((c: string[]) => c[0] === 'end')![1]

		const err = new Error('redis-error')
		errorHandler(err)
		connectHandler()
		reconnectHandler()
		endHandler()

		expect(logger.error).toHaveBeenCalledWith('Redis Client Error', err)
		expect(logger.info).toHaveBeenCalledWith('Redis Client Connected')
		expect(logger.warn).toHaveBeenCalledWith('Redis Client Reconnecting...')
		expect(logger.warn).toHaveBeenCalledWith('Redis Client Connection Ended')
	})

	it('should log and throw if connect fails', async () => {
		mockClient.connect.mockRejectedValueOnce(new Error('fail'))
		await expect(service.connect()).rejects.toThrow('fail')
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to connect Redis:',
			expect.any(Error)
		)
	})

	it('should throw in getClient if client not ready', async () => {
		mockClient.isReady = false
		await service.connect()
		expect(() => service.getClient()).toThrow(
			'Redis not connected or not ready. Call connect() first.'
		)
	})

	it('should return the connected client via getClient', async () => {
		await service.connect()
		const client = service.getClient()
		expect(client).toBe(mockClient)
	})

	it('should disconnect and clean state if client is connected', async () => {
		await service.connect()
		await service.disconnect()
		expect(mockClient.quit).toHaveBeenCalled()
		expect((service as any).client).toBeNull()
		expect(logger.info).toHaveBeenCalledWith('Redis disconnected.')
	})

	it('should do nothing on disconnect if client is not connected', async () => {
		;(service as any).client = null
		await service.disconnect()
		expect(logger.info).not.toHaveBeenCalledWith(
			expect.stringContaining('disconnected')
		)
	})

	it('should reset internal state for tests', async () => {
		await service.connect()
		service.__resetForTests()
		expect((service as any).client).toBeNull()
	})
})
