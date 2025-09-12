import convictConfig from '@/services/config'
import logger from '@/services/logger'
import { createClient, RedisClientType } from 'redis'

export class RedisService {
	private client: RedisClientType | null = null
	public displayName = 'Redis'

	constructor(private config = convictConfig.get('database.redis')) {}

	/**
	 * Connects to Redis and returns the client.
	 */
	public async connect(): Promise<RedisClientType | null> {
		if (!this.config.enabled) {
			logger.info(`${this.displayName} is disabled. Skipping connection.`)
			return null
		}

		if (this.client && this.client.isReady) {
			logger.info(`${this.displayName} client already connected.`)
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

			this.client.on('error', err => logger.error('Redis Client Error', err))
			this.client.on('connect', () => logger.info('Redis Client Connected'))
			this.client.on('reconnecting', () =>
				logger.warn('Redis Client Reconnecting...')
			)
			this.client.on('end', () => logger.warn('Redis Client Connection Ended'))

			await this.client.connect()
			logger.info(`${this.displayName} connected successfully.`)
			return this.client
		} catch (error) {
			logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Returns the connected Redis client.
	 */
	public getClient(): RedisClientType {
		if (!this.client || !this.client.isReady) {
			throw new Error('Redis not connected or not ready. Call connect() first.')
		}
		return this.client
	}

	/**
	 * Disconnects from Redis.
	 */
	public async disconnect(): Promise<void> {
		if (this.client && this.client.isReady) {
			await this.client.quit()
			this.client = null
			logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * Reset internal state for testing
	 */
	public __resetForTests() {
		this.client = null
	}
}

// Singleton instance for registry
export const redisService = new RedisService()
