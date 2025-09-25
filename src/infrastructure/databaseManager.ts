import { config } from '@/services/config'
import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'
import { Mongo } from './providers/Mongo'
import { Postgres } from './providers/Postgres'
import { Redis } from './providers/Redis'

export const PROVIDERS = ['postgres', 'redis', 'mongo'] as const
export type Provider = (typeof PROVIDERS)[number]

export type DatabaseClientsMap = {
	postgres: PrismaClient
	mongo: Db
	redis: RedisClientType
}

export type ProviderClassesMap = {
	postgres: Postgres
	mongo: Mongo
	redis: Redis
}

type Registry = {
	[P in Provider]: {
		getProvider: () => ProviderClassesMap[P]
		instance?: DatabaseClientsMap[P]
	}
}

const registry: Registry = {
	postgres: {
		getProvider: () => new Postgres(config.get('database.postgres'), logger)
	},
	redis: { getProvider: () => new Redis(config.get('database.redis'), logger) },
	mongo: { getProvider: () => new Mongo(config.get('database.mongo'), logger) }
}

export interface DatabaseManager {
	initialize(keys?: Provider[]): Promise<void>
	shutdown(): Promise<void>
	get<P extends Provider>(key: P): DatabaseClientsMap[P]
	getAll(): DatabaseClientsMap
}

/**
 * @const databaseManager
 * @description A singleton object that manages the lifecycle (initialization, shutdown)
 * and access to all external database services.
 */
export const databaseManager: DatabaseManager = {
	/**
	 * Initializes and connects to the specified providers. If no keys are provided,
	 * it initializes all registered providers.
	 * @returns {Promise<void>}
	 */
	async initialize(): Promise<void> {
		for (const key of PROVIDERS) {
			const entry = registry[key]
			if (!entry.instance) {
				const provider = entry.getProvider()
				try {
					entry.instance = await provider.connect()
				} catch (error: any) {
					const errorMessage = `DatabaseManager: Failed to initialize ${provider.displayName}: ${error.message}`
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
	 * @returns {DatabaseClientsMap[P]} The initialized client instance.
	 * @throws {Error} If the provider has not been initialized.
	 */
	get<P extends Provider>(key: P): DatabaseClientsMap[P] {
		const entry = registry[key]
		if (!entry?.instance) {
			throw new Error(`Provider "${key}" not initialized.`)
		}

		return entry.instance
	},

	/**
	 * Retrieves all initialized provider client instances.
	 * @returns {DatabaseClientsMap} A map of all provider clients.
	 * @throws {Error} If any provider in the registry has not been initialized.
	 */
	getAll(): DatabaseClientsMap {
		return Object.fromEntries(
			Object.entries(registry).map(([key, entry]) => {
				if (!entry?.instance)
					throw new Error(`Provider "${key}" not initialized.`)
				return [key, entry.instance]
			})
		) as DatabaseClientsMap
	}
}
