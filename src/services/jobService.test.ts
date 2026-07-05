import { Mocked, vi } from 'vitest'
import { QueueManager } from '../infrastructure/queueManager'
import { JobService } from './jobService'

// Mock the queue object that would be returned by the queueManager
const mockQueue = {
	add: vi.fn()
}

// Mock the QueueManager dependency
const mockQueueManager: Mocked<QueueManager> = {
	get: vi.fn().mockReturnValue(mockQueue),
	initialize: vi.fn(),
	getAll: vi.fn(),
	shutdown: vi.fn()
}

describe('JobService', () => {
	let jobService: JobService

	beforeEach(() => {
		vi.clearAllMocks()
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

	describe('dispatchUseCase', () => {
		it('should dispatch a use case job correctly', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('job-123'),
				getData: vi.fn().mockReturnValue({ userId: 'user-1' }),
				getMeta: vi.fn().mockReturnValue({ source: 'api' }),
				getUser: vi.fn().mockReturnValue({ id: 'u1', organizationId: 'org1' }),
				getPublicUser: vi.fn().mockReturnValue(true)
			} as any

			await jobService.dispatchUseCase('emails', 'UserCreateUseCase', mockJob, {
				priority: 1
			})

			expect(mockQueueManager.get).toHaveBeenCalledWith('emails')
			expect(mockQueue.add).toHaveBeenCalledWith(
				'UserCreateUseCase',
				{
					jobType: 'useCase',
					useCaseName: 'UserCreateUseCase',
					jobData: {
						id: 'job-123',
						payload: { userId: 'user-1' },
						meta: { source: 'api' },
						user: { id: 'u1', organizationId: 'org1' }
					}
				},
				{ priority: 1 }
			)
		})

		it('should exclude user when getPublicUser returns false', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('job-456'),
				getData: vi.fn().mockReturnValue({ data: 'test' }),
				getMeta: vi.fn().mockReturnValue({}),
				getUser: vi.fn().mockReturnValue({ id: 'u2' }),
				getPublicUser: vi.fn().mockReturnValue(false)
			} as any

			await jobService.dispatchUseCase('emails', 'SomeUseCase' as any, mockJob)
		})

		it('should use default options when not provided', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('job-789'),
				getData: vi.fn().mockReturnValue({}),
				getMeta: vi.fn().mockReturnValue({}),
				getPublicUser: vi.fn().mockReturnValue(false)
			} as any

			await jobService.dispatchUseCase('emails', 'TestUseCase' as any, mockJob)

			expect(mockQueue.add).toHaveBeenCalledWith(
				'TestUseCase',
				expect.any(Object),
				{}
			)
		})
	})

	describe('dispatchSimpleTask', () => {
		it('should dispatch a simple task job correctly', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('task-001'),
				getData: vi.fn().mockReturnValue({ taskData: 'value' })
			} as any

			await jobService.dispatchSimpleTask('emails', 'simpleTaskName', mockJob, {
				delay: 5000
			})

			expect(mockQueueManager.get).toHaveBeenCalledWith('emails')
			expect(mockQueue.add).toHaveBeenCalledWith(
				'simpleTaskName',
				{
					id: 'task-001',
					jobType: 'simpleTask',
					jobData: { taskData: 'value' }
				},
				{ delay: 5000 }
			)
		})

		it('should use default options when not provided', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('task-002'),
				getData: vi.fn().mockReturnValue({ test: 'data' })
			} as any

			await jobService.dispatchSimpleTask('emails', 'emailTask', mockJob)

			expect(mockQueue.add).toHaveBeenCalledWith(
				'emailTask',
				expect.any(Object),
				{}
			)
		})
	})

	describe('dispatchJobScript', () => {
		it('should dispatch a job script correctly', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('script-001'),
				getData: vi.fn().mockReturnValue({ scriptParam: 'value' })
			} as any

			await jobService.dispatchJobScript(
				'emails',
				'CleanUpOldSessionsJob',
				mockJob,
				{ priority: 2 }
			)

			expect(mockQueueManager.get).toHaveBeenCalledWith('emails')
			expect(mockQueue.add).toHaveBeenCalledWith(
				'CleanUpOldSessionsJob',
				{
					id: 'script-001',
					jobType: 'jobScript',
					scriptName: 'CleanUpOldSessionsJob',
					jobData: { scriptParam: 'value' }
				},
				{ priority: 2 }
			)
		})

		it('should use default options when not provided', async () => {
			const mockJob = {
				getId: vi.fn().mockReturnValue('script-002'),
				getData: vi.fn().mockReturnValue({})
			} as any

			await jobService.dispatchJobScript('emails', 'SomeScript' as any, mockJob)

			expect(mockQueue.add).toHaveBeenCalledWith(
				'SomeScript',
				expect.any(Object),
				{}
			)
		})
	})
})
