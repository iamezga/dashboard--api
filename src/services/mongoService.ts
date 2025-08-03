import config from '@/services/config'
import logger from '@/services/logger'
import { Db, MongoClient } from 'mongodb'

let client: MongoClient | null = null
let db: Db | null = null

const mongoConfig = config.get('database.mongo')

/**
 * Mongodb connection.
 * If Mongodb is disabled in the configuration or is already connected, it does nothing.
 * @returns db instance or null
 * @throws Error if Mongodb is enabled but the URL is not configured or the connection fails.
 */
export const connectMongo = async (): Promise<Db | null> => {
	if (!mongoConfig.enabled) {
		logger.info('MongoDB is disabled in configuration. Skipping connection.')
		return null
	}

	if (!mongoConfig.url) {
		logger.error('MongoDB URL is not configured when MongoDB is enabled.')
		throw new Error('MongoDB URL is not configured.')
	}

	// If the client already exists and is "ready"
	if (client && db) {
		logger.info('MongoDB client already initialized and potentially connected.')
		return db
	}

	if (!mongoConfig.db) {
		logger.error(
			'MongoDB database name is not configured when MongoDB is enabled.'
		)
		throw new Error('MongoDB database name is not configured.')
	}

	try {
		client = new MongoClient(mongoConfig.url)
		await client.connect()

		// Get db instance
		db = client.db(mongoConfig.db)
		logger.info('MongoDB connected successfully.')

		// Listeners
		client.on('close', () => {
			logger.warn('MongoDB connection closed.')
			// The driver handles automatic reconnection if possible.
			// To force full reconnection, set null the client and dB variables
		})
		client.on('reconnect', () => logger.info('MongoDB reconnected.'))
		client.on('error', error => logger.error('MongoDB error:', error))

		return db
	} catch (error) {
		logger.error('Failed to connect to MongoDB:', error)
		throw error
	}
}

/**
 * Get database instance.
 * @returns db instance
 * @throws Error if Mongodb is not connected.
 */
export const getMongoDb = (): Db => {
	if (!db) {
		throw new Error('MongoDB not connected. Call connectMongo() first.')
	}
	return db
}

/**
 * Disconnect the current Mongodb connection.
 * If there is no active connection, it does nothing.
 */
export const disconnectMongo = async (): Promise<void> => {
	if (client) {
		await client.close()
		client = null
		db = null
		logger.info('MongoDB disconnected.')
	}
}
