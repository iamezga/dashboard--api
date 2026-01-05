import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Logger } from 'pino'
import { createClient, RedisClientType } from 'redis'

/**
 * @class Redis
 * @description Redis in-memory data store provider using node-redis client.
 *
 * This provider manages Redis connection lifecycle with automatic reconnection,
 * exponential backoff, and comprehensive event monitoring.
 *
 * Use Cases:
 * - Session storage: Fast TTL-based session management
 * - Rate limiting: Distributed counters with expiration
 * - Caching: High-performance temporary data storage
 * - Password recovery tokens: Secure temporary token storage
 * - Queue backend: BullMQ job queue persistence
 *
 * Features:
 * - Automatic reconnection with exponential backoff (max 5 attempts)
 * - Connection pooling via node-redis
 * - Event-driven monitoring (connect, error, reconnecting, end)
 * - Password authentication support
 * - Database selection (0-15)
 *
 * Architecture:
 * - Returns RedisClientType for direct Redis operations
 * - Singleton pattern enforced by DatabaseManager
 * - Used by rate limiter, sessions, and BullMQ
 *
 * @implements {ProviderInterface}
 */
export class Redis implements ProviderInterface {
	private client: RedisClientType | null = null
	public displayName = 'Redis'

	/**
	 * Creates a new Redis provider instance.
	 * @param {Object} config - Redis configuration
	 * @param {string} config.host - Redis server hostname (e.g., 'localhost')
	 * @param {number} config.port - Redis server port (default: 6379)
	 * @param {string} config.password - Redis authentication password (optional)
	 * @param {number} config.db - Redis database number (0-15, default: 0)
	 * @param {Logger} logger - Pino logger instance for connection events
	 */
	constructor(
		private config: {
			host: string
			port: number
			password: string
			db: number
		},
		private logger: Logger
	) {}

	/**
	 * Connects to Redis server with automatic reconnection strategy.
	 * Implements exponential backoff with max 5 retry attempts.
	 * @returns {Promise<RedisClientType>} The connected Redis client
	 * @throws {Error} If connection fails after max retry attempts
	 */
	public async connect(): Promise<RedisClientType> {
		if (this.client && this.client.isReady) {
			this.logger.info(`${this.displayName} client already connected.`)
			return this.client
		}

		try {
			this.client = createClient({
				url: `redis://${this.config.host}:${this.config.port}/${this.config.db}`,
				password: this.config.password || undefined,
				socket: {
					reconnectStrategy: (retries: number) => {
						if (retries >= 5) {
							//  Stop reconnect after 5 attempts
							return new Error('Max reconnection attempts reached')
						}
						return Math.min(retries * 100, 3000)
					}
				}
			})

			this.client.on('error', err =>
				this.logger.error('Redis Client Error', err)
			)
			this.client.on('connect', () =>
				this.logger.info('Redis Client Connected')
			)
			this.client.on('reconnecting', () =>
				this.logger.warn('Redis Client Reconnecting...')
			)
			this.client.on('end', () =>
				this.logger.warn('Redis Client Connection Ended')
			)

			await this.client.connect()
			this.logger.info(`${this.displayName} connected successfully.`)
			return this.client
		} catch (error: any) {
			this.logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Gracefully disconnects from Redis using QUIT command.
	 * Waits for pending operations to complete before closing.
	 * @returns {Promise<void>}
	 */
	public async disconnect(): Promise<void> {
		if (this.client && this.client.isReady) {
			await this.client.quit()
			this.client = null
			this.logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * Resets internal state for testing purposes.
	 * ⚠️ For testing only - does not close active connections.
	 */
	public __resetForTests() {
		this.client = null
	}
}
