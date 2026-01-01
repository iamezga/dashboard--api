import { config } from '@/services/config'
import logger from '@/services/logger'

import { PrismaClient } from '@/generated/prisma/client'
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
		provider: ProviderClassesMap[P]
		instance?: DatabaseClientsMap[P]
	}
}

const registry: Registry = {
	postgres: { provider: new Postgres(config.get('database.postgres'), logger) },
	redis: { provider: new Redis(config.get('database.redis'), logger) },
	mongo: { provider: new Mongo(config.get('database.mongo'), logger) }
}

export interface DatabaseManager {
	initialize(): Promise<void>
	shutdown(): Promise<void>
	get<P extends Provider>(key: P): DatabaseClientsMap[P]
	getAll(): DatabaseClientsMap
	getInitialized(): Partial<DatabaseClientsMap>
	getStatus(): Record<Provider, { initialized: boolean; message?: string }>
}

/**
 * @const databaseManager
 * @description A singleton object that manages the lifecycle (initialization, shutdown)
 * and access to all external database services.
 */
export const databaseManager: DatabaseManager = {
	/**
	 * Initialize and connect the providers.
	 * @returns {Promise<void>}
	 */
	async initialize(): Promise<void> {
		const configured =
			(config.get('database.providers') as Provider[] | undefined) ??
			(PROVIDERS as unknown as Provider[])
		const targets = configured
		const started: Provider[] = []

		try {
			await Promise.all(
				targets.map(async key => {
					const entry = registry[key]
					if (!entry.instance) {
						entry.instance = await entry.provider.connect()
						started.push(key)
					}
				})
			)
		} catch (error: any) {
			logger.error(`DatabaseManager: initialization failed: ${error.message}`)
			// attempt to cleanup started providers
			await Promise.all(
				started.map(async k => {
					try {
						await registry[k].provider.disconnect()
						// eslint-disable-next-line @typescript-eslint/no-unused-vars
					} catch (_e: any) {
						// ignore
					}
					registry[k].instance = undefined
				})
			)
			throw new Error(
				`DatabaseManager: Failed to initialize providers: ${error.message}`
			)
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
				try {
					await entry.provider.disconnect()
				} catch (e) {
					logger.warn(
						`DatabaseManager: error disconnecting ${key}: ${
							(e as Error).message
						}`
					)
				}
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
		const configured =
			(config.get('database.providers') as Provider[] | undefined) ??
			(PROVIDERS as unknown as Provider[])
		return Object.fromEntries(
			configured.map(key => {
				const entry = registry[key]
				if (!entry?.instance)
					throw new Error(`Provider "${key}" not initialized.`)
				return [key, entry.instance]
			})
		) as DatabaseClientsMap
	},

	getInitialized(): Partial<DatabaseClientsMap> {
		return Object.fromEntries(
			Object.entries(registry)
				.filter(([, entry]) => Boolean(entry.instance))
				.map(([k, entry]) => [k, entry.instance])
		) as Partial<DatabaseClientsMap>
	},

	getStatus(): Record<Provider, { initialized: boolean; message?: string }> {
		const status = {} as Record<
			Provider,
			{ initialized: boolean; message?: string }
		>
		for (const key of PROVIDERS) {
			const entry = registry[key]
			status[key] = { initialized: Boolean(entry.instance) }
		}
		return status
	}
}
