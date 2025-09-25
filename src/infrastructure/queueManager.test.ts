import { Queue } from 'bullmq'
import { Bullmq } from './providers/Bullmq'

// Mock only the Bullmq class, but keep other exports like QUEUE_NAMES
jest.mock('./providers/Bullmq', () => {
	const originalModule = jest.requireActual('./providers/Bullmq')
	return {
		__esModule: true,
		...originalModule,
		Bullmq: jest.fn()
	}
})

describe('queueManager', () => {
	let queueManager: any
	let Bullmq: any
	let QUEUE_NAMES: readonly string[]
	let mockBullmqProvider: jest.Mocked<Bullmq>
	const mockQueues: Partial<Record<string, Queue>> = {}

	beforeEach(() => {
		// Clear mocks before each test
		jest.clearAllMocks()
		jest.resetModules() // This is crucial to get a fresh queueManager instance

		// Re-import modules after resetting. This will get the mocked versions.
		const bullmqModule: any = require('./providers/Bullmq')
		Bullmq = bullmqModule.Bullmq
		QUEUE_NAMES = bullmqModule.QUEUE_NAMES

		// Create mock queues for each defined name
		QUEUE_NAMES.forEach(name => {
			mockQueues[name] = { name, close: jest.fn() } as any
		})

		// Create a mock instance of the Bullmq provider class
		mockBullmqProvider = new Bullmq({} as any) as jest.Mocked<Bullmq>
		mockBullmqProvider.connect = jest.fn().mockResolvedValue(undefined)
		mockBullmqProvider.disconnect = jest.fn().mockResolvedValue(undefined)
		mockBullmqProvider.getQueue = jest
			.fn()
			.mockImplementation((name: string) => mockQueues[name])

		// Tell Jest that any time `new Bullmq()` is called, it should return our pre-configured mock instance
		;(Bullmq as jest.Mock).mockImplementation(() => mockBullmqProvider)

		// Import the module under test AFTER mocks are set up
		queueManager = require('./queueManager').queueManager
	})

	it('should initialize the provider and get all queues', async () => {
		await queueManager.initialize()

		expect(mockBullmqProvider.connect).toHaveBeenCalledTimes(1)
		expect(mockBullmqProvider.getQueue).toHaveBeenCalledTimes(
			QUEUE_NAMES.length
		)

		for (const name of QUEUE_NAMES) {
			expect(mockBullmqProvider.getQueue).toHaveBeenCalledWith(name)
		}
	})

	it('should get a specific queue by name after initialization', async () => {
		await queueManager.initialize()
		const queue = queueManager.get(QUEUE_NAMES[0])

		expect(queue).toBeDefined()
		expect(queue.name).toBe(QUEUE_NAMES[0])
	})

	it('should throw an error when getting a queue before initialization', () => {
		expect(() => queueManager.get(QUEUE_NAMES[0])).toThrow(
			`Queue "${QUEUE_NAMES[0]}" not found.`
		)
	})

	it('should get all initialized queues', async () => {
		await queueManager.initialize()
		const allQueues = queueManager.getAll()

		expect(Object.keys(allQueues)).toEqual(QUEUE_NAMES)
		expect(allQueues[QUEUE_NAMES[0]].name).toBe(QUEUE_NAMES[0])
	})

	it('should call the provider shutdown method', async () => {
		await queueManager.initialize()
		await queueManager.shutdown()

		expect(mockBullmqProvider.disconnect).toHaveBeenCalledTimes(1)
	})
})
