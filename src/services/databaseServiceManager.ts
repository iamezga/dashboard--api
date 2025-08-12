import config from '@/services/config'
import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'
import { connectMongo, disconnectMongo } from './mongoService'
import { connectPrisma, disconnectPrisma } from './prismaService'
import { connectRedis, disconnectRedis } from './redisService'

/**
 * Centralizes the connection logic for all database engines used by the API.
 *
 * This file acts as the single point of definition for:
 * - Which databases are supported in this project.
 * - How each database is connected and disconnected.
 * - How active database clients are exposed to the rest of the application.
 *
 * The purpose of this design is to make database configuration and changes
 * **fully isolated** from business logic.
 * Adding, removing, or replacing a database engine only requires:
 *  1. Adding the corresponding connection/disconnection functions.
 *  2. Updating this file to register the new client type.
 *
 * This approach enables:
 * - Support for multiple database engines at the same time.
 * - Simple migrations to a different database technology without touching
 *   repositories or use cases.
 * - Centralized control of connection lifecycles.
 *
 * Example:
 *  If you want to replace MongoDB with MySQL:
 *   - Add `connectMySQL` and `disconnectMySQL` functions.
 *   - Update `ConnectedDatabases` and `DatabaseClients` types with the new client.
 *   - Add initialization/shutdown logic in this file.
 *
 * The rest of the application will automatically work with the new database
 * as long as repository classes are updated to use the new client type.
 *
 * @typedef {Object} ConnectedDatabases
 *   Active instances of connected database clients, keyed by their type.
 * @typedef {Object} DatabaseClients
 *   Map of supported database types to their client classes.
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

export interface DatabaseServiceManager {
	initialize: () => Promise<void>
	shutdown: () => Promise<void>
	getDatabases: () => ConnectedDatabases
}

const currentConfig = config.get('database')
let prismaInstance: PrismaClient | undefined
let redisInstance: RedisClientType | undefined
let mongoDbInstance: Db | undefined

/**
 * Initializes and connects the services according to their configuration.
 * Only try to connect the services that are enabled.
 */
async function initialize(): Promise<void> {
	logger.info('DatabaseServiceManager: Initializing services...')

	// Initialize prisma
	if (currentConfig.prisma.enabled) {
		logger.info(
			'DatabaseServiceManager: Attempting to connect Prisma (PostgreSQL)...'
		)
		try {
			prismaInstance = (await connectPrisma()) || undefined
			if (prismaInstance) {
				logger.info(
					'ServiceManager: Prisma (PostgreSQL) connected successfully.'
				)
			}
		} catch (error: any) {
			logger.error(
				`ServiceManager: Failed to connect Prisma (PostgreSQL): ${error.message}`
			)
			throw new Error(
				`Failed to initialize Prisma (PostgreSQL) client: ${error.message}`
			)
		}
	} else {
		logger.info(
			'ServiceManager: Prisma (PostgreSQL) is disabled. Skipping connection.'
		)
	}

	// Initialize redis
	if (currentConfig.redis.enabled) {
		logger.info('ServiceManager: Attempting to connect Redis...')
		try {
			redisInstance = (await connectRedis()) || undefined
			if (redisInstance) {
				logger.info('ServiceManager: Redis connected successfully.')
			}
		} catch (error: any) {
			logger.error(`ServiceManager: Failed to connect Redis: ${error.message}`)
			throw new Error(`Failed to initialize Redis client: ${error.message}`)
		}
	} else {
		logger.info('ServiceManager: Redis is disabled. Skipping connection.')
	}

	// Initialize mongo
	if (currentConfig.mongo.enabled) {
		logger.info('ServiceManager: Attempting to connect MongoDB...')
		try {
			mongoDbInstance = (await connectMongo()) || undefined
			if (mongoDbInstance) {
				logger.info('ServiceManager: MongoDB connected successfully.')
			}
		} catch (error: any) {
			logger.error(
				`ServiceManager: Failed to connect MongoDB: ${error.message}`
			)
			throw new Error(`Failed to initialize MongoDB client: ${error.message}`)
		}
	} else {
		logger.info('ServiceManager: MongoDB is disabled. Skipping connection.')
	}

	logger.info('ServiceManager: Service initialization process completed.')
}

/**
 * Close the connections of all the services that were initialized.
 */
async function shutdown(): Promise<void> {
	logger.info('ServiceManager: Shutting down services...')

	if (prismaInstance) {
		await disconnectPrisma()
		logger.info('ServiceManager: Prisma (PostgreSQL) disconnected.')
	}

	if (redisInstance) {
		await disconnectRedis()
		logger.info('ServiceManager: Redis disconnected.')
	}

	if (mongoDbInstance) {
		await disconnectMongo()
		logger.info('ServiceManager: MongoDB disconnected.')
	}

	logger.info('ServiceManager: All services shut down.')
}

/**
 * Returns the instances of the connected services.
 * @returns {ConnectedDatabases}
 */
function getDatabases(): ConnectedDatabases {
	return {
		prisma: prismaInstance,
		redis: redisInstance,
		mongo: mongoDbInstance
	}
}

const databaseServiceManager: DatabaseServiceManager = {
	initialize,
	shutdown,
	getDatabases: getDatabases
}

export { databaseServiceManager }
