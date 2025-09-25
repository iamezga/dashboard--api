import { getContainer } from '@/core/dependencyContainer'
import { useCaseFactory } from '@/core/useCaseFactory'
import { infrastructureManager } from '@/infrastructure'
import { QUEUE_NAMES, QueueName } from '@/infrastructure/providers/Bullmq'
import { Job as AppJob } from '@/lib/Job'
import { UseCaseKeys } from '@/modules'
import logger from '@/services/logger'
import { Job, Worker } from 'bullmq'
import { config } from './services/config'

async function main() {
	const queueNameArg = process.argv[2] as QueueName

	if (!queueNameArg || !QUEUE_NAMES.includes(queueNameArg)) {
		throw new Error(
			`Invalid or missing queue name. Please provide one of: ${QUEUE_NAMES.join(
				', '
			)}`
		)
	}

	// Initialize dependencies
	await infrastructureManager.initialize()
	logger.info('Worker providers initialized.')

	const container = getContainer()
	logger.info('Worker container initialized.')

	const worker = new Worker(
		queueNameArg,
		async (job: Job) => {
			const { useCaseName, jobData } = job.data as {
				useCaseName: UseCaseKeys
				jobData: any
			}
			logger.info(
				{ useCaseName, jobId: job.id },
				`Processing job: ${useCaseName}`
			)

			try {
				const appJob = new AppJob({
					id: job.id || 'unknown-job-id',
					attempts: job.attemptsMade,
					data: jobData.payload,
					meta: jobData.meta,
					user: jobData.user,
					logger: logger.child({ jobId: job.id, useCase: useCaseName })
				})
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
				throw error // Re-throw to let BullMQ handle the job failure (e.g., retry).
			}
		},
		{
			connection: config.get('database.redis'),
			concurrency: 5,
			removeOnComplete: { count: 1000 },
			removeOnFail: { count: 5000 }
		}
	)

	// Add process listeners for a graceful shutdown
	const shutdown = async (signal: string) => {
		logger.info(`${signal} signal received. Shutting down gracefully.`)
		await worker.close() // Close the worker's connection
		await infrastructureManager.shutdown() // Disconnect infrastructure
		process.exit(0)
	}

	process.on('SIGTERM', () => shutdown('SIGTERM'))
	process.on('SIGINT', () => shutdown('SIGINT'))

	worker.on('error', err =>
		logger.error({ error: err }, 'Worker encountered an unhandled error')
	)

	logger.info(`Worker listening for jobs on queue: "${queueNameArg}"`)
}

main().catch(async err => {
	logger.error({ error: err }, 'Worker failed to start')
	await infrastructureManager.shutdown() // Disconnect databases
	process.exit(1)
})
