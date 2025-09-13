import logger from '@/services/logger'
import { Prisma, PrismaClient } from '@prisma/client'
import convictConfig from './config'

export class PrismaService {
	private client: PrismaClient | null = null
	public displayName = 'PostgreSQL (Prisma)'

	constructor(private config = convictConfig.get('database.postgres')) {}

	/**
	 * Connects Prisma client if not already connected.
	 * @returns {Promise<PrismaClient>} The connected Prisma client instance.
	 * @throws {Error} if the connection URL is not configured.
	 */
	public async connect(): Promise<PrismaClient> {
		if (this.client) {
			logger.info(`${this.displayName} already initialized.`)
			return this.client
		}

		if (!this.config.url) {
			logger.error(`${this.displayName} URL is not configured.`)
			throw new Error(`${this.displayName} URL is not configured.`)
		}

		try {
			this.client = new PrismaClient({
				log: [
					{ level: 'query', emit: 'event' },
					{ level: 'error', emit: 'event' },
					{ level: 'info', emit: 'event' },
					{ level: 'warn', emit: 'event' }
				]
			})

			this.client.$on(<never>'error', (e: Prisma.LogEvent) =>
				logger.error('Prisma Error:', e)
			)
			this.client.$on(<never>'info', (e: Prisma.LogEvent) =>
				logger.info('Prisma Info:', e)
			)
			this.client.$on(<never>'warn', (e: Prisma.LogEvent) =>
				logger.warn('Prisma Warn:', e)
			)
			// this.client.$on(<never>'quey', (e: Prisma.LogEvent) =>
			// 	logger.warn('Prisma Query:', e)
			// )

			await this.client.$connect()
			logger.info(`${this.displayName} connected successfully.`)
			return this.client
		} catch (error) {
			logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Returns the connected Prisma client.
	 */
	public getClient(): PrismaClient {
		if (!this.client) {
			throw new Error(
				`${this.displayName} not connected. Call connect() first.`
			)
		}
		return this.client
	}

	/**
	 * Disconnects the Prisma client if connected.
	 */
	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.$disconnect()
			this.client = null
			logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * For testing purposes: reset the internal client
	 */
	public __resetForTests() {
		this.client = null
	}
}

// Export a singleton instance compatible with registry
export const prismaService = new PrismaService()
