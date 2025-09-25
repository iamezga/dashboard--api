import { QueueName } from '@/infrastructure/providers/Bullmq'
import { QueueManager } from '@/infrastructure/queueManager'
import { UseCaseKeys } from '@/modules'
import { AuthenticatedUser } from '@/modules/user/entities/User'
import { JobInterface as AppJob } from '@/types/job/JobInterface'
import { JobMetaInterface } from '@/types/job/JobMetaInterface'
import { JobServiceInterface } from '@/types/jobService/JobServiceInterface'

export interface JobPayload {
	useCaseName: UseCaseKeys
	jobData: {
		payload: Record<string, any>
		meta: JobMetaInterface
		user?: AuthenticatedUser
	}
}

export class JobService implements JobServiceInterface {
	constructor(private queueManager: QueueManager) {}

	/**
	 * Adds a job to a specific queue to be processed by a worker in the background.
	 * @param {QueueName} queueName The name of the queue to add the job to.
	 * @param {UseCaseKeys} useCaseName The name of the use case to execute.
	 * @param {AppJob} appJob The application's Job object, which contains the payload and metadata.
	 * @param {Record<string, any>} [options] Optional BullMQ job options (e.g., delay, priority).
	 */
	public async add<T>(
		queueName: QueueName,
		useCaseName: UseCaseKeys,
		appJob: T extends AppJob ? T : AppJob,
		options?: Record<string, any>
	): Promise<void> {
		const queue = this.queueManager.get(queueName)

		const jobPayload: JobPayload = {
			useCaseName,
			jobData: {
				payload: appJob.getData(),
				meta: appJob.getMeta(),
				user: appJob.getPublicUser() ? appJob.getUser() : undefined
			}
		}
		await queue.add(useCaseName, jobPayload, options)
	}
}
