import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Db, MongoClient } from 'mongodb'
import { Logger } from 'pino'

export class Mongo implements ProviderInterface {
	private client: MongoClient | null = null
	private instance: Db | null = null
	public displayName = 'MongoDB'

	constructor(
		private config: {
			url: string
			db: string
		},
		private logger: Logger
	) {}

	/**
	 * Connects to MongoDB and returns the db instance.
	 */
	public async connect(): Promise<Db> {
		if (!this.config.url) {
			this.logger.error(`${this.displayName} URL is not configured.`)
			throw new Error(`${this.displayName} URL is not configured.`)
		}

		if (!this.config.db) {
			this.logger.error(`${this.displayName} database name is not configured.`)
			throw new Error('MongoDB database name is not configured.')
		}

		if (this.client && this.instance) {
			this.logger.info(`${this.displayName} client already connected.`)
			return this.instance
		}

		try {
			this.client = new MongoClient(this.config.url)
			await this.client.connect()
			this.instance = this.client.db(this.config.db)

			this.client.on('close', () =>
				this.logger.warn('MongoDB connection closed.')
			)
			this.client.on('reconnect', () =>
				this.logger.info('MongoDB reconnected.')
			)
			this.client.on('error', err => this.logger.error('MongoDB error:', err))

			this.logger.info(`${this.displayName} connected successfully.`)
			return this.instance
		} catch (error) {
			this.logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Disconnects from MongoDB.
	 */
	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.close()
			this.client = null
			this.instance = null
			this.logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * Reset internal state for testing
	 */
	public __resetForTests() {
		this.client = null
		this.instance = null
	}
}
