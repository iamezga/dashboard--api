import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface JobServiceInterface
 * @description The contract for any job queue service.
 * This abstraction allows the application to use different queue providers
 * (e.g., Redis, RabbitMQ) without changing the business logic.
 */
export interface JobServiceInterface {
	/**
	 * Adds a new job to the queue.
	 * @param {JobInterface} job - The job to be added.
	 * @returns {Promise<void>}
	 */
	addJob(job: JobInterface): Promise<void>
}
