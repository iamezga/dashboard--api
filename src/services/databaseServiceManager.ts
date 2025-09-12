import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'
import { mongoService } from './mongoService'
import { prismaService } from './prismaService'
import { redisService } from './redisService'

/**
 * Interfaces for connected database clients
 */
export interface ConnectedDatabases {
	prisma?: PrismaClient
	redis?: RedisClientType
	mongo?: Db
}

// Map of DB type to client type
export interface DatabaseClients {
	postgres: PrismaClient
	mongo: Db
	redis: RedisClientType
	// add more DB clients here if needed
}

/**
 * Type for service registry entry
 */
interface ServiceEntry<T> {
	service: {
		connect: () => Promise<T | null>
		getClient: () => T
		disconnect: () => Promise<void>
		displayName: string
		__resetForTests: () => void
	}
	instance?: T
}

/**
 * Registry mapping keys to services
 */
const registry: Record<string, ServiceEntry<any>> = {
	prisma: { service: prismaService },
	redis: { service: redisService },
	mongo: { service: mongoService }
}

/**
 * Initializes all enabled services in the registry.
 * Skips services already initialized.
 */
export async function initialize(): Promise<void> {
	logger.info('DatabaseServiceManager: Initializing services...')

	for (const key of Object.keys(registry)) {
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
			entry.instance = client || undefined

			if (client) {
				logger.info(
					`ServiceManager: ${entry.service.displayName} connected successfully.`
				)
			}
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
export function getDatabases(): ConnectedDatabases {
	return {
		prisma: registry.prisma.instance,
		redis: registry.redis.instance,
		mongo: registry.mongo.instance
	}
}

/**
 * Reset module state (for testing)
 */
export function __resetForTests() {}

/**
 * Export service manager
 */
export const databaseServiceManager = {
	initialize,
	shutdown,
	getDatabases
}
