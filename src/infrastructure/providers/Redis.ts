import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { Logger } from 'pino'
import { createClient, RedisClientType } from 'redis'

export class Redis implements ProviderInterface {
	private client: RedisClientType | null = null
	public displayName = 'Redis'

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
	 * Connects to Redis and returns the client.
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
	 * Disconnects from Redis.
	 */
	public async disconnect(): Promise<void> {
		if (this.client && this.client.isReady) {
			await this.client.quit()
			this.client = null
			this.logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * Reset internal state for testing
	 */
	public __resetForTests() {
		this.client = null
	}
}
