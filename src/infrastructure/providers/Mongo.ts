import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Db, MongoClient } from 'mongodb'
import { Logger } from 'pino'

/**
 * @class Mongo
 * @description MongoDB database provider using native MongoDB driver.
 *
 * This provider manages MongoDB connection lifecycle with automatic
 * reconnection, event handling, and proper error logging.
 *
 * Use Cases:
 * - Audit logs: High write throughput with flexible schema
 * - Event sourcing: Append-only data patterns
 * - Document storage: Unstructured or semi-structured data
 *
 * Features:
 * - Native MongoDB driver for optimal performance
 * - Automatic reconnection on connection loss
 * - Comprehensive event logging (close, reconnect, error)
 * - Graceful shutdown handling
 *
 * Architecture:
 * - Returns Db instance (not MongoClient) for collection access
 * - Singleton pattern enforced by DatabaseManager
 * - Event-driven connection monitoring
 *
 * @implements {ProviderInterface}
 */
export class Mongo implements ProviderInterface {
	private client: MongoClient | null = null
	private instance: Db | null = null
	public displayName = 'MongoDB'

	/**
	 * Creates a new Mongo provider instance.
	 * @param {Object} config - MongoDB configuration
	 * @param {string} config.url - MongoDB connection URL (e.g., mongodb://host:port/)
	 * @param {string} config.db - Database name to connect to
	 * @param {Logger} logger - Pino logger instance for database events
	 */
	constructor(
		private config: {
			url: string
			db: string
		},
		private logger: Logger
	) {}

	/**
	 * Connects to MongoDB and returns the database instance.
	 * Automatically sets up event handlers for connection monitoring.
	 * @returns {Promise<Db>} The MongoDB database instance
	 * @throws {Error} If connection URL or database name is not configured
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
			this.client.on('error', (err: any) =>
				this.logger.error('MongoDB error:', err)
			)

			this.logger.info(`${this.displayName} connected successfully.`)
			return this.instance
		} catch (error: any) {
			this.logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Disconnects from MongoDB and cleans up resources.
	 * @returns {Promise<void>}
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
	 * Resets internal state for testing purposes.
	 * ⚠️ For testing only - does not close active connections.
	 */
	public __resetForTests() {
		this.client = null
		this.instance = null
	}
}
