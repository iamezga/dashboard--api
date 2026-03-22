import { getContainer } from '@/core/dependencyContainer'
import { jobScriptFactory } from '@/core/jobScriptFactory'
import { useCaseFactory } from '@/core/useCaseFactory'
import { infrastructureManager } from '@/infrastructure'
import { QUEUE_NAMES, QueueName } from '@/infrastructure/providers/Bullmq'
import { Job as AppJob } from '@/lib/Job'
import logger from '@/services/logger'
import { Job, Worker } from 'bullmq'
import { config } from './services/config'
import { JobMetaInterface } from './types/job/JobMetaInterface'
import { AnyJobPayload } from './types/jobScript/JobPayload'

async function main() {
	const queueNames = process.argv.slice(2) as QueueName[]

	if (queueNames.length === 0) {
		throw new Error(
			`No queue names provided. Please provide one or more of: ${QUEUE_NAMES.join(
				', '
			)}`
		)
	}

	for (const name of queueNames) {
		if (!QUEUE_NAMES.includes(name)) {
			throw new Error(
				`Invalid queue name: "${name}". Valid names are: ${QUEUE_NAMES.join(
					', '
				)}`
			)
		}
	}

	// Initialize dependencies
	await infrastructureManager.initialize()
	logger.info('Worker providers initialized.')

	const container = getContainer()
	logger.info('Worker container initialized.')

	/**
	 * This setup allows a single worker process to listen to multiple queues.
	 * Each queue gets its own `Worker` instance, but they all run within this
	 * single Node.js process. This is an efficient way to handle several
	 * low-to-medium traffic queues without the overhead of running a separate
	 * process for each one.
	 * For high-traffic queues that require dedicated resources, a separate,
	 * specialized worker process can still be launched (e.g., `npm run worker high-traffic-queue`).
	 * To instance multiples Workers only add the names of each queue.
	 * `npm run worker emails notifications`
	 */
	const workers: Worker[] = []

	for (const queueName of queueNames) {
		const worker = new Worker(
			queueName,
			async (job: Job) => {
				// The payload should define what type of job this is.
				// This allows the worker to be a generic "job router".
				const jobPayload = job.data as AnyJobPayload
				const { jobType } = jobPayload

				logger.info(
					{ jobType, jobId: job.id, queue: worker.name },
					`Processing job: ${job.name}`
				)

				switch (jobType) {
					case 'useCase': {
						// Type safety: jobPayload is now correctly inferred as UseCaseJobPayload
						const { useCaseName, jobData } = jobPayload
						try {
							const appJob = new AppJob({
								// Use the propagated correlation ID
								id: jobData.id || job.id || 'unknown-job-id',
								attempts: job.attemptsMade,
								meta: jobData.meta as JobMetaInterface,
								user: jobData.user,
								logger: logger.child({ jobId: job.id, useCase: useCaseName })
							})
							appJob.setData(jobData.payload)

							const useCase = useCaseFactory(useCaseName, { container })
							const result = await useCase.run(appJob)
							logger.info(
								{ useCaseName, jobId: job.id },
								`Job completed successfully.`
							)
							return result
						} catch (error: any) {
							logger.error(
								{
									useCaseName,
									jobId: job.id,
									error: error.message,
									stack: error.stack
								},
								`Job failed: ${useCaseName}`
							)
							throw error // Re-throw to let BullMQ handle the job failure.
						}
					}

					case 'jobScript': {
						// Type safety: jobPayload is now correctly inferred as JobScriptJobPayload
						const { scriptName, jobData } = jobPayload
						try {
							const script = jobScriptFactory(scriptName)
							return await script.run(jobData, {
								container,
								logger: logger.child({ jobId: job.id, script: scriptName }),
								jobId: job.id
							})
						} catch (error: any) {
							logger.error(
								{
									scriptName,
									jobId: job.id,
									error: error.message
								},
								`Job script failed: ${scriptName}`
							)
							throw error
						}
					}

					case 'simpleTask': {
						// Example of a simple task that doesn't need the full UseCase context.
						// Type safety: jobPayload is now correctly inferred as SimpleTaskJobPayload
						const { jobData } = jobPayload
						logger.info({ jobData }, 'Executing a simple background task.')
						await new Promise(resolve => setTimeout(resolve, 1000)) // Simulate work
						return { success: true, message: 'Simple task finished.' }
					}

					default:
						throw new Error(`Unknown job type: ${jobType}`)
				}
			},
			{
				connection: config.get('database.redis'),
				concurrency: 5,
				removeOnComplete: { count: 1000 },
				removeOnFail: { count: 5000 }
			}
		)
		workers.push(worker)
	}

	// Add process listeners for a graceful shutdown
	const shutdown = async (signal: string) => {
		logger.info(`${signal} signal received. Shutting down gracefully.`)
		await Promise.all(workers.map(w => w.close())) // Close all worker connections
		await infrastructureManager.shutdown() // Disconnect infrastructure
		process.exit(0)
	}

	process.on('SIGTERM', () => shutdown('SIGTERM'))
	process.on('SIGINT', () => shutdown('SIGINT'))

	for (const worker of workers) {
		worker.on('error', err =>
			logger.error(
				{ error: err, queue: worker.name },
				'Worker encountered an unhandled error'
			)
		)
	}

	logger.info(
		`Worker listening for jobs on queues: "${queueNames.join('", "')}"`
	)
}

main().catch(async err => {
	logger.error({ error: err }, 'Worker failed to start')
	await infrastructureManager.shutdown() // Disconnect databases
	process.exit(1)
})
