import { Queue } from 'bullmq'
import logger from '../../services/logger'
import { Bullmq } from './Bullmq'

jest.mock('bullmq', () => ({
	Queue: jest.fn()
}))

jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	error: jest.fn()
}))

describe('Bullmq', () => {
	let service: Bullmq
	let mockQueue: any

	beforeEach(() => {
		jest.clearAllMocks()
		mockQueue = {
			close: jest.fn().mockResolvedValue(undefined)
		}
		;(Queue as unknown as jest.Mock).mockImplementation(() => mockQueue)

		service = new Bullmq(
			{
				host: 'localhost',
				port: 6379,
				password: '',
				db: 0
			},
			logger
		)
	})

	it('should connect successfully and return Queue instance', async () => {
		const client = await service.connect()
		expect(Queue).toHaveBeenCalledWith('BullMQ Queue Service (redis)', {
			connection: {
				host: 'localhost',
				port: 6379,
				password: undefined,
				db: 0,
				socketTimeout: 3000
			},
			defaultJobOptions: { removeOnComplete: true }
		})
		expect(client).toBe(mockQueue)
		expect(logger.info).toHaveBeenCalledWith(
			'BullMQ Queue Service (redis) connected successfully.'
		)
	})

	it('should return existing client if already connected', async () => {
		await service.connect()
		const client2 = await service.connect()
		expect(client2).toBe(mockQueue)
		expect(logger.info).toHaveBeenCalledWith(
			'BullMQ Queue Service (redis) already initialized.'
		)
	})

	it('should disconnect and reset client', async () => {
		await service.connect()
		await service.disconnect()
		expect(mockQueue.close).toHaveBeenCalled()
		expect((service as any).client).toBeNull()
		expect(logger.info).toHaveBeenCalledWith(
			'BullMQ Queue Service (redis) disconnected.'
		)
	})

	it('should do nothing on disconnect if client is null', async () => {
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

	it('should log and throw if Queue constructor fails', async () => {
		;(Queue as unknown as jest.Mock).mockImplementationOnce(() => {
			throw new Error('constructor-fail')
		})
		const failingService = new Bullmq(
			{ host: 'localhost', port: 6379, password: '', db: 0 },
			logger
		)
		await expect(failingService.connect()).rejects.toThrow('constructor-fail')
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to connect BullMQ Queue Service (redis):',
			expect.any(Error)
		)
	})
})
