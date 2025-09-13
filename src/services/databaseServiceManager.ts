import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'
import config from './config'
import { MongoService, mongoService } from './mongoService'
import { PrismaService, prismaService } from './prismaService'
import { RedisService, redisService } from './redisService'

// Map of DB type to client type
export interface DatabaseClients {
	postgres: PrismaClient
	mongo: Db
	redis: RedisClientType
	// add more DB clients here if needed
}
export type DBProviders = 'business' | 'cache' | 'log'
export const DB_PREFIXES = ['Postgres', 'Mongo', 'Redis'] as const
export type DBType = Lowercase<(typeof DB_PREFIXES)[number]>

/**
 * Type for service registry entry
 */
interface ServiceEntry<T> {
	service: T
	instance?: any
}

/**
 * Registry mapping keys to services
 */
const registry: Record<
	string,
	ServiceEntry<PrismaService | RedisService | MongoService>
> = {
	postgres: { service: prismaService },
	redis: { service: redisService },
	mongo: { service: mongoService }
}

/**
 * Initializes all enabled services in the registry.
 * Skips services already initialized.
 */
export async function initialize(): Promise<void> {
	logger.info('DatabaseServiceManager: Initializing services...')

	// Create a Set to store unique database types that need to be initialized.
	const databasesToInitialize = new Set<string>()

	// Add validation to ensure essential providers are set.
	const requiredProviders: DBProviders[] = ['business', 'cache', 'log']
	for (const required of requiredProviders) {
		if (
			!config.has(`database.providers.${required}`) ||
			config.get(`database.providers.${required}`) === 'none'
		) {
			throw new Error(
				`Critical error: The required database provider for '${required}' is not configured.`
			)
		}
		const providerName = config.get(`database.providers.${required}`)
		databasesToInitialize.add(providerName)
	}

	for (const key of databasesToInitialize) {
		const entry = registry[key]

		if (entry.instance) {
			logger.info(
				`ServiceManager: ${entry.service.displayName} already initialized. Skipping.`
			)
			continue
		}

		logger.info(
			`ServiceManager: Attempting to connect ${entry.service.displayName}...`
		)
		try {
			const client = await entry.service.connect()
			entry.instance = client
			logger.info(
				`ServiceManager: ${entry.service.displayName} connected successfully.`
			)
		} catch (error: any) {
			logger.error(
				`ServiceManager: Failed to connect ${entry.service.displayName}: ${error.message}`
			)
			throw new Error(
				`Failed to initialize ${entry.service.displayName} client: ${error.message}`
			)
		}
	}

	logger.info('DatabaseServiceManager: Service initialization completed.')
}

/**
 * Shutdown all initialized services
 */
export async function shutdown(): Promise<void> {
	logger.info('DatabaseServiceManager: Shutting down services...')
	for (const key of Object.keys(registry)) {
		const entry = registry[key]
		if (entry.instance) {
			await entry.service.disconnect()
			entry.instance = undefined
			logger.info(`ServiceManager: ${entry.service.displayName} disconnected.`)
		}
	}
	logger.info('DatabaseServiceManager: All services shut down.')
}

/**
 * Get currently connected database clients
 */
export function getDatabases(): DatabaseClients {
	return {
		postgres: registry.postgres.instance,
		redis: registry.redis.instance,
		mongo: registry.mongo.instance
	}
}

/**
 * Reset module state (for testing)
 */
export function __resetForTests() {
	for (const key of Object.keys(registry)) {
		const entry = registry[key]
		entry.instance = undefined
		entry.service.__resetForTests()
	}
}

/**
 * Export service manager
 */
export const databaseServiceManager = {
	initialize,
	shutdown,
	getDatabases
}
