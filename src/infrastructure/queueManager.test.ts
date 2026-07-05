import { Queue } from 'bullmq'
import { vi } from 'vitest'

const setupQueueManager = async () => {
	vi.resetModules()
	vi.clearAllMocks()

	const mockQueues: Partial<Record<string, Queue>> = {}
	const providerInstance = {
		connect: vi.fn().mockResolvedValue(undefined),
		disconnect: vi.fn().mockResolvedValue(undefined),
		getQueue: vi.fn((name: string) => mockQueues[name])
	}

	const queueNames = ['emails'] as const

	const BullmqMock = vi.fn(function () {
		return providerInstance
	})

	vi.doMock('@/infrastructure/providers/Bullmq', () => ({
		Bullmq: BullmqMock,
		QUEUE_NAMES: queueNames
	}))

	for (const name of queueNames) {
		mockQueues[name] = { name, close: vi.fn() } as unknown as Queue
	}

	const mod = await import('./queueManager')

	return {
		queueManager: mod.queueManager,
		providerInstance,
		queueNames,
		mockQueues,
		BullmqMock
	}
}

describe('queueManager', () => {
	it('should initialize the provider and get all queues', async () => {
		const { queueManager, providerInstance, queueNames } =
			await setupQueueManager()

		await queueManager.initialize()

		expect(providerInstance.connect).toHaveBeenCalledTimes(1)
		expect(providerInstance.getQueue).toHaveBeenCalledTimes(queueNames.length)
		for (const name of queueNames) {
			expect(providerInstance.getQueue).toHaveBeenCalledWith(name)
		}
	})

	it('should get a specific queue by name after initialization', async () => {
		const { queueManager, queueNames } = await setupQueueManager()

		await queueManager.initialize()
		const queue = queueManager.get(queueNames[0])

		expect(queue).toBeDefined()
		expect(queue.name).toBe(queueNames[0])
	})

	it('should throw an error when getting a queue before initialization', async () => {
		const { queueManager, queueNames } = await setupQueueManager()

		expect(() => queueManager.get(queueNames[0])).toThrow(
			`Queue "${queueNames[0]}" not found.`
		)
	})

	it('should get all initialized queues', async () => {
		const { queueManager, queueNames } = await setupQueueManager()

		await queueManager.initialize()
		const allQueues = queueManager.getAll()

		expect(Object.keys(allQueues)).toEqual([...queueNames])
		expect(allQueues[queueNames[0]].name).toBe(queueNames[0])
	})

	it('should call the provider shutdown method', async () => {
		const { queueManager, providerInstance } = await setupQueueManager()

		await queueManager.initialize()
		await queueManager.shutdown()

		expect(providerInstance.disconnect).toHaveBeenCalledTimes(1)
	})
})
