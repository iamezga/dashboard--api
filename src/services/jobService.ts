import { QueueName } from '@/infrastructure/providers/Bullmq'
import { QueueManager } from '@/infrastructure/queueManager'
import { AnyJobPayload } from '@/types/jobScript/JobPayload'
import { JobServiceInterface } from '@/types/jobService/JobServiceInterface'

export class JobService implements JobServiceInterface {
	constructor(private queueManager: QueueManager) {}

	/**
	 * Dispatches a job to a specific queue to be processed by a worker.
	 * @param {QueueName} queueName The name of the queue to add the job to.
	 * @param {string} jobName The name of the job, used by the worker to identify the task.
	 * @param {AnyJobPayload} payload The data required for the job to be executed.
	 * @param {Record<string, any>} [options] Optional BullMQ job options (e.g., delay, priority).
	 */
	public async dispatch(
		queueName: QueueName,
		jobName: string,
		payload: AnyJobPayload,
		options?: Record<string, any>
	): Promise<void> {
		const queue = this.queueManager.get(queueName)
		// The service's only responsibility is to add a job to the queue.
		// It does not know or care about the payload's structure.
		await queue.add(jobName, payload, options)
	}
}
