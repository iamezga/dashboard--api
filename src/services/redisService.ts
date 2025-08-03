import config from '@/services/config'
import logger from '@/services/logger'
import { createClient, RedisClientType } from 'redis'

let redisClient: RedisClientType | null = null
const redisConfig = config.get('database.redis')

export const connectRedis = async (): Promise<RedisClientType | null> => {
	if (!redisConfig.enabled) {
		logger.info('Redis is disabled in configuration. Skipping connection.')
		return null
	}

	if (redisClient && redisClient.isReady) {
		logger.info('Redis client already connected.')
		return redisClient
	}

	try {
		redisClient = createClient({
			url: `redis://${redisConfig.host}:${redisConfig.port}/${redisConfig.db}`,
			password: redisConfig.password || undefined
		})

		redisClient.on('error', err => logger.error('Redis Client Error', err))
		redisClient.on('connect', () => logger.info('Redis Client Connected'))
		redisClient.on('reconnecting', () =>
			logger.warn('Redis Client Reconnecting...')
		)
		redisClient.on('end', () => logger.warn('Redis Client Connection Ended'))

		await redisClient.connect()
		logger.info('Redis connected successfully.')
		return redisClient
	} catch (error) {
		logger.error('Failed to connect to Redis:', error)
		throw error
	}
}

export const getRedisClient = (): RedisClientType => {
	if (!redisClient || !redisClient.isReady) {
		throw new Error(
			'Redis not connected or not ready. Call connectRedis() first.'
		)
	}
	return redisClient
}

export const disconnectRedis = async (): Promise<void> => {
	if (redisClient && redisClient.isReady) {
		await redisClient.quit() // `quit()` for a forceful exit, `disconnect()` for a graceful one
		redisClient = null
		logger.info('Redis disconnected.')
	}
}
