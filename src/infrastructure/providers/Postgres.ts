import { PrismaClient } from '@/generated/prisma/client'
import { LogEvent } from '@/generated/prisma/internal/prismaNamespace'
import { ProviderInterface } from '@/types/providers/ProviderInterface'
import { PrismaPg } from '@prisma/adapter-pg'

import { Logger } from 'pino'

export class Postgres implements ProviderInterface {
	private client: PrismaClient | null = null
	public displayName = 'PostgreSQL (Prisma)'

	constructor(private config: { url: string }, private logger: Logger) {}

	/**
	 * Connects Prisma client if not already connected.
	 * @returns {Promise<PrismaClient>} The connected Prisma client instance.
	 * @throws {Error} if the connection URL is not configured.
	 */
	public async connect(): Promise<PrismaClient> {
		if (this.client) {
			this.logger.info(`${this.displayName} already connected.`)
			return this.client
		}

		if (!this.config.url) {
			this.logger.error(`${this.displayName} URL is not configured.`)
			throw new Error(`${this.displayName} URL is not configured.`)
		}

		try {
			const adapter = new PrismaPg({ connectionString: this.config.url })
			this.client = new PrismaClient({
				adapter,
				log: [
					{ level: 'query', emit: 'event' },
					{ level: 'error', emit: 'event' },
					{ level: 'info', emit: 'event' },
					{ level: 'warn', emit: 'event' }
				]
			})

			this.client.$on(<never>'error', (e: LogEvent) =>
				this.logger.error(`Prisma Error: ${e.message}`)
			)
			this.client.$on(<never>'info', (e: LogEvent) =>
				this.logger.info(`Prisma Info: ${e.message}`)
			)
			this.client.$on(<never>'warn', (e: LogEvent) =>
				this.logger.warn(`Prisma Warn: ${e.message}`)
			)
			// this.client.$on(<never>'quey', (e: LogEvent) =>
			// 	this.logger.warn(`Prisma Query: ${e}`)
			// )

			await this.client.$connect()
			this.logger.info(`${this.displayName} connected successfully.`)
			return this.client
		} catch (error: any) {
			this.logger.error(`Failed to connect ${this.displayName}:`, error)
			throw error
		}
	}

	/**
	 * Disconnects the Prisma client if connected.
	 */
	public async disconnect(): Promise<void> {
		if (this.client) {
			await this.client.$disconnect()
			this.client = null
			this.logger.info(`${this.displayName} disconnected.`)
		}
	}

	/**
	 * For testing purposes: reset the internal client
	 */
	public __resetForTests() {
		this.client = null
	}
}
