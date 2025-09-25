import { QueueManager } from '../infrastructure/queueManager'
import { JobInterface as AppJob } from '../types/job/JobInterface'
import { JobPayload, JobService } from './jobService'

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

// Mock the application's Job object
const mockAppJob = {
	getData: jest.fn().mockReturnValue({ some: 'data' }),
	getMeta: jest.fn().mockReturnValue({ ip: '127.0.0.1' }),
	getUser: jest.fn().mockReturnValue({ id: 'user-1', email: 'test@test.com' }),
	getPublicUser: jest.fn().mockReturnValue(true) // Default to including user
} as unknown as jest.Mocked<AppJob>

describe('JobService', () => {
	let jobService: JobService

	beforeEach(() => {
		jest.clearAllMocks()
		jobService = new JobService(mockQueueManager)
	})

	it('should add a job with user data when getPublicUser is true', async () => {
		const queueName = 'emails'
		const useCaseName = 'UserSendWelcomeEmailUseCase'
		const options = { delay: 1000 }

		mockAppJob.getPublicUser.mockReturnValue(true as any)

		await jobService.add(queueName, useCaseName, mockAppJob, options)

		// Verify that the correct queue was requested
		expect(mockQueueManager.get).toHaveBeenCalledWith(queueName)

		// Verify that the job was added to the queue with the correct payload
		expect(mockQueue.add).toHaveBeenCalledTimes(1)
		const [addedUseCase, addedPayload, addedOptions] =
			mockQueue.add.mock.calls[0]

		expect(addedUseCase).toBe(useCaseName)
		expect(addedPayload.useCaseName).toBe(useCaseName)
		expect(addedPayload.jobData.payload).toEqual({ some: 'data' })
		expect(addedPayload.jobData.meta).toEqual({ ip: '127.0.0.1' })
		expect(addedPayload.jobData.user).toEqual({
			id: 'user-1',
			email: 'test@test.com'
		})
		expect(addedOptions).toEqual(options)
	})

	it('should add a job without user data when getPublicUser is false', async () => {
		const queueName = 'emails'
		const useCaseName = 'SomeOtherUseCase' as any

		// Simulate a job where the user should not be passed to the worker
		mockAppJob.getPublicUser.mockReturnValue(false as any)

		await jobService.add(queueName, useCaseName, mockAppJob)

		expect(mockQueueManager.get).toHaveBeenCalledWith(queueName)
		expect(mockQueue.add).toHaveBeenCalledTimes(1)

		const addedPayload: JobPayload = mockQueue.add.mock.calls[0][1]

		// The key assertion: the user field should be undefined
		expect(addedPayload.jobData.user).toBeUndefined()
		expect(addedPayload.jobData.payload).toEqual({ some: 'data' })
	})
})
