import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Queue } from 'bullmq'

/**
 * Defines the names of all available queues in the application.
 * Add new queue names here.
 */
export const QUEUE_NAMES = ['emails'] as const
export type QueueName = (typeof QUEUE_NAMES)[number]

type QueuesMap = {
	[K in QueueName]?: Queue
}

export class Bullmq implements ProviderInterface {
	public displayName = 'BullMQ Queue Manager'
	private logger: any
	private queues: QueuesMap = {}

	private isConnected = false

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
	 * Connects and initializes all defined queues.
	 * @returns {Promise<void>}
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
	 * Retrieves a specific queue instance.
	 * @param {QueueName} name The name of the queue to retrieve.
	 * @returns {Queue} The BullMQ Queue instance.
	 * @throws {Error} If the queue has not been initialized.
	 */
	public getQueue<K extends QueueName>(name: K): Queue {
		const queue = this.queues[name]
		if (!queue) {
			throw new Error(`Queue "${name}" not found or not initialized.`)
		}
		return queue
	}

	/**
	 * Disconnects from all queues.
	 * @returns {Promise<void>}
	 */
	public async disconnect(): Promise<void> {
		await Promise.all(Object.values(this.queues).map(q => q?.close()))
		this.queues = {}
		this.isConnected = false
		this.logger.info(`${this.displayName} disconnected.`)
	}

	/**
	 * Helper for tests. Resets the internal state.
	 */
	public __resetForTests() {
		this.queues = {}
		this.isConnected = false
	}
}
