import config from '@/services/config'
import logger from '@/services/logger'
import { PrismaClient } from '@prisma/client'
import { Db } from 'mongodb'
import { RedisClientType } from 'redis'
import {
	ConnectedDatabases,
	DatabaseServiceManager as databaseServiceManager
} from './databaseServiceManager.types'
import { connectMongo, disconnectMongo } from './mongoService'
import { connectPrisma, disconnectPrisma } from './prismaService'
import { connectRedis, disconnectRedis } from './redisService'

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

const databaseServiceManager: databaseServiceManager = {
	initialize,
	shutdown,
	getDatabases: getDatabases
}

export default databaseServiceManager
