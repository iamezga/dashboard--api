import { QueueName } from '@/infrastructure/providers/Bullmq'
import { AnyJobPayload } from '../jobScript/JobPayload'

/**
 * @interface JobServiceInterface
 * @description The contract for any job queue service.
 * This abstraction allows the application to use different queue providers
 * without changing the application logic.
 */
export interface JobServiceInterface {
	/**
	 * Dispatches a job to a specific queue.
	 * @param {QueueName} queueName The name of the queue.
	 * @param {string} jobName The name of the job/task.
	 * @param {AnyJobPayload} payload The strongly-typed data for the job.
	 * @param {Record<string, any>} [options] Optional provider-specific options.
	 */
	dispatch(
		queueName: QueueName,
		jobName: string,
		payload: AnyJobPayload,
		options?: Record<string, any>
	): Promise<void>
}
