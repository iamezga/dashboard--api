import { createClient } from 'redis'
import logger from '../../services/logger'
import { Redis } from './Redis'

jest.mock('redis', () => ({
	createClient: jest.fn()
}))

jest.mock('../../services/logger', () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}))

describe('Redis', () => {
	let service: Redis
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

		service = new Redis(
			{
				host: 'localhost',
				port: 6379,
				db: 0,
				password: ''
			},
			logger
		)
	})

	it('should return existing client if already connected', async () => {
		const first = await service.connect()
		const second = await service.connect()
		expect(first).toBe(second)
		expect(logger.info).toHaveBeenCalledWith('Redis client already connected.')
	})

	it('should connect successfully and register events', async () => {
		mockClient.isReady = false
		await service.connect()

		expect(createClient).toHaveBeenCalledWith({
			url: 'redis://localhost:6379/0',
			password: undefined,
			socket: expect.objectContaining({
				reconnectStrategy: expect.any(Function)
			})
		})

		expect(mockClient.connect).toHaveBeenCalled()

		const calls = mockClient.on.mock.calls
		expect(calls.some((c: any) => c[0] === 'error')).toBe(true)
		expect(calls.some((c: any) => c[0] === 'connect')).toBe(true)
		expect(calls.some((c: any) => c[0] === 'reconnecting')).toBe(true)
		expect(calls.some((c: any) => c[0] === 'end')).toBe(true)

		expect(logger.info).toHaveBeenCalledWith('Redis connected successfully.')
	})

	it('should log redis events correctly', async () => {
		await service.connect()

		const errorHandler = mockClient.on.mock.calls.find(
			(c: any) => c[0] === 'error'
		)![1]
		const connectHandler = mockClient.on.mock.calls.find(
			(c: any) => c[0] === 'connect'
		)![1]
		const reconnectHandler = mockClient.on.mock.calls.find(
			(c: any) => c[0] === 'reconnecting'
		)![1]
		const endHandler = mockClient.on.mock.calls.find(
			(c: any) => c[0] === 'end'
		)![1]

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

	it('should disconnect only if client is connected and ready', async () => {
		await service.connect()
		await service.disconnect()

		expect(mockClient.quit).toHaveBeenCalled()
		expect((service as any).client).toBeNull()
		expect(logger.info).toHaveBeenCalledWith('Redis disconnected.')

		// Should do nothing if client is null
		await service.disconnect()
		expect(logger.info).toHaveBeenCalledTimes(2) // only previous call
	})

	it('should reset internal state for tests', async () => {
		await service.connect()
		service.__resetForTests()
		expect((service as any).client).toBeNull()
	})

	it('should apply reconnectStrategy correctly', async () => {
		await service.connect()
		const options = (createClient as jest.Mock).mock.calls[0][0]
		const strategy = options.socket.reconnectStrategy

		// retries < 5
		expect(strategy(3)).toBe(300)

		// retries >= 5
		const result = strategy(5)
		expect(result).toBeInstanceOf(Error)
		expect(result.message).toBe('Max reconnection attempts reached')
	})
})
