import convictConfig from '@/services/config'
import logger from '@/services/logger'
import { Db, MongoClient } from 'mongodb'

export class MongoService {
	private client: MongoClient | null = null
	private dbInstance: Db | null = null
	public displayName = 'MongoDB'

	constructor(private config = convictConfig.get('database.mongo')) {}

	/**
	 * Connects to MongoDB and returns the db instance.
	 */
	public async connect(): Promise<Db | null> {
		if (!this.config.enabled) {
			logger.info(`${this.displayName} is disabled. Skipping connection.`)
			return null
		}

		if (!this.config.url) {
			logger.error(`${this.displayName} URL is not configured.`)
			throw new Error('MongoDB URL is not configured.')
		}

		if (!this.config.db) {
			logger.error(`${this.displayName} database name is not configured.`)
			throw new Error('MongoDB database name is not configured.')
		}

		if (this.client && this.dbInstance) {
			logger.info(`${this.displayName} client already initialized.`)
			return this.dbInstance
		}

		try {
			this.client = new MongoClient(this.config.url)
			await this.client.connect()
			this.dbInstance = this.client.db(this.config.db)

			this.client.on('close', () => logger.warn('MongoDB connection closed.'))
			this.client.on('reconnect', () => logger.info('MongoDB reconnected.'))
			this.client.on('error', err => logger.error('MongoDB error:', err))

			logger.info(`${this.displayName} connected successfully.`)
			return this.dbInstance
		} catch (error) {
			logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Returns the connected db instance.
	 */
	public getClient(): Db {
		if (!this.dbInstance) {
			throw new Error('MongoDB not connected. Call connect() first.')
		}
		return this.dbInstance
	}

	/**
	 * Disconnects from MongoDB.
	 */
	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.close()
			this.client = null
			this.dbInstance = null
			logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * Reset internal state for testing
	 */
	public __resetForTests() {
		this.client = null
		this.dbInstance = null
	}
}

// Singleton instance for registry
export const mongoService = new MongoService()
