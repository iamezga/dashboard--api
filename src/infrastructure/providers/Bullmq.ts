import logger from '@/services/logger'
import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Queue } from 'bullmq'
import { Logger } from 'pino'

export class Bullmq implements ProviderInterface {
	private client: Queue | null = null

	public displayName = 'BullMQ Queue Service (redis)'

	constructor(
		private config: {
			host: string
			port: number
			password: string
			db: number
		},
		private logger: Logger
	) {}

	public async connect(): Promise<Queue> {
		if (this.client) {
			logger.info(`${this.displayName} already initialized.`)
			return this.client
		}
		try {
			this.client = new Queue(this.displayName, {
				connection: {
					host: this.config.host,
					port: this.config.port,
					password: this.config.password || undefined,
					db: this.config.db,
					socketTimeout: 3000
				},
				defaultJobOptions: {
					removeOnComplete: true
				}
			})
			this.logger.info(`${this.displayName} connected successfully.`)
			return this.client
		} catch (error) {
			logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.close()
			this.client = null
			logger.info(`${this.displayName} disconnected.`)
		}
	}

	public __resetForTests() {
		this.client = null
	}
}
