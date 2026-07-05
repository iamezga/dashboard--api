import { Queue } from 'bullmq'
import { Logger } from 'pino'
import { Mock, vi } from 'vitest'
import { Bullmq, QUEUE_NAMES } from './Bullmq'

const mockLogger = {
	info: vi.fn(),
	error: vi.fn()
} as unknown as Logger

vi.mock('bullmq', () => ({
	Queue: vi.fn()
}))

vi.mock('@/services/logger', () => ({
	__esModule: true,
	default: mockLogger
}))

describe('Bullmq', () => {
	let service: Bullmq
	const mockQueues: Record<string, any> = {}

	beforeEach(async () => {
		vi.clearAllMocks()
		for (const key of Object.keys(mockQueues)) {
			delete mockQueues[key]
		}

		;(Queue as unknown as Mock).mockImplementation(function (name) {
			mockQueues[name] = {
				name,
				close: vi.fn().mockResolvedValue(undefined)
			}
			return mockQueues[name]
		})

		service = new Bullmq(
			{
				host: 'localhost',
				port: 6379,
				password: '',
				db: 0
			},
			mockLogger
		)
	})

	it('should connect and initialize all defined queues', async () => {
		await service.connect()

		for (const name of QUEUE_NAMES) {
			expect(Queue).toHaveBeenCalledWith(
				name,
				expect.objectContaining({
					connection: expect.any(Object)
				})
			)
			expect(mockLogger.info).toHaveBeenCalledWith(
				`Queue "${name}" initialized successfully.`
			)
		}
		expect((service as any).isConnected).toBe(true)
	})

	it('should return existing client if already connected', async () => {
		await service.connect()
		await service.connect()
		expect(Queue).toHaveBeenCalledTimes(QUEUE_NAMES.length) // Should not be called again
		expect(mockLogger.info).toHaveBeenCalledWith(
			'BullMQ Queue Manager already initialized.'
		)
	})

	it('should retrieve a specific queue with getQueue', async () => {
		await service.connect()
		const emailQueue = service.getQueue('emails')
		expect(emailQueue).toBeDefined()
		expect(emailQueue.name).toBe('emails')
	})

	it('should throw an error if getQueue is called for a non-existent queue', () => {
		expect(() => service.getQueue('emails')).toThrow(
			'Queue "emails" not found or not initialized.'
		)
	})

	it('should disconnect and close all queues', async () => {
		await service.connect()
		await service.disconnect()
		for (const name of QUEUE_NAMES) {
			expect(mockQueues[name].close).toHaveBeenCalled()
		}
		expect((service as any).isConnected).toBe(false)
		expect((service as any).queues).toEqual({})
		expect(mockLogger.info).toHaveBeenCalledWith(
			'BullMQ Queue Manager disconnected.'
		)
	})

	it('should reset internal state for tests', async () => {
		await service.connect()
		service.__resetForTests()
		expect((service as any).queues).toEqual({})
		expect((service as any).isConnected).toBe(false)
	})

	it('should log and throw if Queue constructor fails', async () => {
		;(Queue as unknown as Mock).mockImplementationOnce(function () {
			throw new Error('constructor-fail')
		})
		const failingService = new Bullmq(
			{
				host: 'localhost',
				port: 6379,
				password: '',
				db: 0
			},
			mockLogger
		)
		await expect(failingService.connect()).rejects.toThrow('constructor-fail')
		expect(mockLogger.error).toHaveBeenCalledWith(
			'Failed to initialize BullMQ Queue Manager:',
			expect.any(Error)
		)
	})
})
