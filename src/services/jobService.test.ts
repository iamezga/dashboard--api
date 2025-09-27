import { QueueManager } from '../infrastructure/queueManager'
import { JobService } from './jobService'

// Mock the queue object that would be returned by the queueManager
const mockQueue = {
	add: jest.fn()
}

// Mock the QueueManager dependency
const mockQueueManager: jest.Mocked<QueueManager> = {
	get: jest.fn().mockReturnValue(mockQueue),
	initialize: jest.fn(),
	getAll: jest.fn(),
	shutdown: jest.fn()
}

describe('JobService', () => {
	let jobService: JobService

	beforeEach(() => {
		jest.clearAllMocks()
		jobService = new JobService(mockQueueManager)
	})

	it('should dispatch a job to the correct queue with the given payload and options', async () => {
		const queueName = 'emails'
		const jobName = 'UserSendWelcomeEmailUseCase'
		const payload = { jobType: 'simpleTask', jobData: { some: 'data' } } as any
		const options = { delay: 1000 }

		await jobService.dispatch(queueName, jobName, payload, options)

		// Verify that the correct queue was requested
		expect(mockQueueManager.get).toHaveBeenCalledWith(queueName)

		// Verify that the job was added to the queue with the correct payload
		expect(mockQueue.add).toHaveBeenCalledTimes(1)
		const [addedJobName, addedPayload, addedOptions] =
			mockQueue.add.mock.calls[0]

		expect(addedJobName).toBe(jobName)
		expect(addedPayload).toEqual(payload)
		expect(addedOptions).toEqual(options)
	})
})
