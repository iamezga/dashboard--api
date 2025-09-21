import { config } from '@/services/config'
import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'
import { Queue } from 'bullmq'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'
import { Bullmq } from './providers/Bullmq'
import { Mongo } from './providers/Mongo'
import { Postgres } from './providers/Postgres'
import { Redis } from './providers/Redis'

export const PROVIDERS = ['postgres', 'redis', 'mongo', 'queue'] as const
export type Provider = (typeof PROVIDERS)[number]

export type ProviderClientsMap = {
	postgres: PrismaClient
	mongo: Db
	redis: RedisClientType
	queue: Queue
}
export type DbClientsMap = {
	postgres: PrismaClient
	mongo: Db
	redis: RedisClientType
}

export type ProviderClassesMap = {
	postgres: Postgres
	mongo: Mongo
	redis: Redis
	queue: Bullmq
}

type Registry = {
	[P in Provider]: {
		getProvider: () => ProviderClassesMap[P]
		instance?: ProviderClientsMap[P]
	}
}

const registry: Registry = {
	postgres: {
		getProvider: () => new Postgres(config.get('database.postgres'), logger)
	},
	redis: { getProvider: () => new Redis(config.get('database.redis'), logger) },
	mongo: { getProvider: () => new Mongo(config.get('database.mongo'), logger) },
	queue: { getProvider: () => new Bullmq(config.get('database.redis'), logger) }
}

export interface ProviderManager {
	initialize(keys?: Provider[]): Promise<void>
	shutdown(): Promise<void>
	get<P extends Provider>(key: P): ProviderClientsMap[P]
	getAll(): ProviderClientsMap
	getDbClients(): DbClientsMap
}

/**
 * @const providerManager
 * @description A singleton object that manages the lifecycle (initialization, shutdown)
 * and access to all external service providers like databases and message queues.
 */
export const providerManager: ProviderManager = {
	/**
	 * Initializes and connects to the specified providers. If no keys are provided,
	 * it initializes all registered providers.
	 * @param {Provider[]} [keys] - An optional array of provider keys to initialize.
	 * @returns {Promise<void>}
	 */
	async initialize(
		keys: Provider[] = ['postgres', 'mongo', 'redis', 'queue']
	): Promise<void> {
		for (const key of keys) {
			const entry = registry[key]
			if (!entry) throw new Error(`Provider "${key}" not found in registry.`)
			if (!entry.instance) {
				const provider = entry.getProvider()
				try {
					entry.instance = await provider.connect()
				} catch (error: any) {
					const errorMessage = `ProviderManager: Failed to initialize ${provider.displayName}: ${error.message}`
					logger.error(errorMessage)
					throw new Error(errorMessage)
				}
			}
		}
	},

	/**
	 * Gracefully disconnects all initialized providers.
	 * @returns {Promise<void>}
	 */
	async shutdown(): Promise<void> {
		for (const key of Object.keys(registry) as Provider[]) {
			const entry = registry[key]
			if (entry.instance) {
				await entry.getProvider().disconnect()
				entry.instance = undefined
			}
		}
	},

	/**
	 * Retrieves the client instance for a given provider.
	 * @template P
	 * @param {P} key - The key of the provider to retrieve.
	 * @returns {ProviderClientsMap[P]} The initialized client instance.
	 * @throws {Error} If the provider has not been initialized.
	 */
	get<P extends Provider>(key: P): ProviderClientsMap[P] {
		const entry = registry[key]
		if (!entry?.instance) {
			throw new Error(`Provider "${key}" not initialized.`)
		}

		return entry.instance
	},

	/**
	 * Retrieves all initialized provider client instances.
	 * @returns {ProviderClientsMap} A map of all provider clients.
	 * @throws {Error} If any provider in the registry has not been initialized.
	 */
	getAll(): ProviderClientsMap {
		return Object.fromEntries(
			Object.entries(registry).map(([key, entry]) => {
				if (!entry?.instance)
					throw new Error(`Provider "${key}" not initialized.`)
				return [key, entry.instance]
			})
		) as ProviderClientsMap
	},

	/**
	 * Retrieves a map containing only the database-related client instances.
	 * @returns {DbClientsMap} A map of database clients (postgres, mongo, redis).
	 */

	getDbClients(): DbClientsMap {
		return {
			postgres: this.get('postgres'),
			mongo: this.get('mongo'),
			redis: this.get('redis')
		}
	}
}
