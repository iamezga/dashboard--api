import { QueueName } from '@/infrastructure/providers/Bullmq'
import { QueueManager } from '@/infrastructure/queueManager'
import { JobScriptKeys } from '@/jobScripts'
import { UseCaseKeys } from '@/modules'
import { JobInterface } from '@/types/job/JobInterface'
import {
	AnyJobPayload,
	JobScriptJobPayload,
	SimpleTaskJobPayload,
	UseCaseJobPayload
} from '@/types/jobScript/JobPayload'
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

	/**
	 * Dispatches a UseCase job to the specified queue.
	 * @param queueName
	 * @param useCaseName
	 * @param job
	 * @param options?
	 * @returns
	 */
	dispatchUseCase(
		queueName: QueueName,
		useCaseName: UseCaseKeys,
		job: JobInterface,
		options: Record<string, any> = {}
	) {
		const payload: UseCaseJobPayload = {
			jobType: 'useCase',
			useCaseName,
			jobData: {
				id: job.getId(),
				payload: job.getData(),
				meta: job.getMeta(),
				user: job.getPublicUser() ? job.getUser() : undefined
			}
		}
		return this.dispatch(queueName, useCaseName, payload, options)
	}

	/**
	 * Dispatches a simple task job to the specified queue.
	 * @param queueName
	 * @param taskName
	 * @param job
	 * @param options?
	 * @returns
	 */
	dispatchSimpleTask(
		queueName: QueueName,
		taskName: string,
		job: JobInterface,
		options: Record<string, any> = {}
	) {
		const payload: SimpleTaskJobPayload = {
			id: job.getId(),
			jobType: 'simpleTask',
			jobData: job.getData()
		}
		return this.dispatch(queueName, taskName, payload, options)
	}

	/**
	 * Dispatches a job script to the specified queue.
	 * @param queueName
	 * @param scriptName
	 * @param job
	 * @param options?
	 * @returns
	 */
	dispatchJobScript(
		queueName: QueueName,
		scriptName: JobScriptKeys,
		job: JobInterface,
		options: Record<string, any> = {}
	) {
		const payload: JobScriptJobPayload = {
			id: job.getId(),
			jobType: 'jobScript',
			scriptName,
			jobData: job.getData()
		}
		return this.dispatch(queueName, scriptName, payload, options)
	}
}
