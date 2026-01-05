import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Queue } from 'bullmq'

/**
 * Defines the names of all available queues in the application.
 * Add new queue names here when creating additional background job queues.
 *
 * @example
 * ```typescript
 * // Add a new queue
 * export const QUEUE_NAMES = ['emails', 'notifications', 'reports'] as const
 * ```
 */
export const QUEUE_NAMES = ['emails'] as const
export type QueueName = (typeof QUEUE_NAMES)[number]

type QueuesMap = {
	[K in QueueName]?: Queue
}

/**
 * @class Bullmq
 * @description BullMQ queue manager provider for background job processing.
 *
 * This provider initializes and manages BullMQ queues backed by Redis,
 * enabling reliable asynchronous job processing with features like:
 * - Job retries with exponential backoff
 * - Job prioritization
 * - Delayed/scheduled jobs
 * - Job progress tracking
 * - Queue metrics and monitoring
 *
 * Use Cases:
 * - Email sending: Async email delivery without blocking requests
 * - Report generation: Long-running background processes
 * - Data processing: Batch operations and ETL tasks
 * - Notifications: Push notifications and alerts
 *
 * Architecture:
 * - Queues are defined centrally in QUEUE_NAMES constant
 * - Each queue is initialized with Redis connection
 * - Jobs are processed by worker.ts (separate process)
 * - Auto-cleanup: Completed jobs are automatically removed
 *
 * Queue Configuration:
 * - Connection: Uses same Redis instance as other services
 * - Socket timeout: 3000ms
 * - Auto-removal: Completed jobs deleted immediately
 *
 * @implements {ProviderInterface}
 */
export class Bullmq implements ProviderInterface {
	public displayName = 'BullMQ Queue Manager'
	private logger: any
	private queues: QueuesMap = {}

	private isConnected = false

	/**
	 * Creates a new BullMQ queue manager instance.
	 * @param {Object} connectionConfig - Redis connection configuration for BullMQ
	 * @param {string} connectionConfig.host - Redis server hostname
	 * @param {number} connectionConfig.port - Redis server port
	 * @param {string} connectionConfig.password - Redis authentication password (optional)
	 * @param {number} connectionConfig.db - Redis database number (0-15)
	 * @param {Logger} logger - Pino logger instance for queue events
	 */
	constructor(
		private readonly connectionConfig: {
			host: string
			port: number
			password: string
			db: number
		},
		logger: any
	) {
		this.logger = logger
	}

	/**
	 * Connects and initializes all queues defined in QUEUE_NAMES.
	 * Creates a Queue instance for each queue name with shared Redis connection.
	 * @returns {Promise<void>}
	 * @throws {Error} If queue initialization fails
	 */
	public async connect(): Promise<void> {
		if (this.isConnected) {
			this.logger.info(`${this.displayName} already initialized.`)
			return
		}

		try {
			for (const name of QUEUE_NAMES) {
				this.queues[name] = new Queue(name, {
					connection: {
						host: this.connectionConfig.host,
						port: this.connectionConfig.port,
						password: this.connectionConfig.password || undefined,
						db: this.connectionConfig.db,
						socketTimeout: 3000
					},
					defaultJobOptions: {
						removeOnComplete: true
					}
				})
				this.logger.info(`Queue "${name}" initialized successfully.`)
			}
			this.isConnected = true
		} catch (error: any) {
			this.logger.error(`Failed to initialize ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Retrieves a specific queue instance by name.
	 * @template K - The queue name type
	 * @param {K} name - The name of the queue to retrieve (must be in QUEUE_NAMES)
	 * @returns {Queue} The BullMQ Queue instance
	 * @throws {Error} If the queue has not been initialized or doesn't exist
	 * @example
	 * ```typescript
	 * const emailQueue = bullmq.getQueue('emails')
	 * await emailQueue.add('sendWelcomeEmail', { userId: '123' })
	 * ```
	 */
	public getQueue<K extends QueueName>(name: K): Queue {
		const queue = this.queues[name]
		if (!queue) {
			throw new Error(`Queue "${name}" not found or not initialized.`)
		}
		return queue
	}

	/**
	 * Gracefully closes all queue connections.
	 * Waits for pending operations to complete before closing.
	 * @returns {Promise<void>}
	 */
	public async disconnect(): Promise<void> {
		await Promise.all(Object.values(this.queues).map(q => q?.close()))
		this.queues = {}
		this.isConnected = false
		this.logger.info(`${this.displayName} disconnected.`)
	}

	/**
	 * Resets internal state for testing purposes.
	 * ⚠️ For testing only - does not close active queue connections.
	 */
	public __resetForTests() {
		this.queues = {}
		this.isConnected = false
	}
}
