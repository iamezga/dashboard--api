import logger from '@/services/logger'
import { databaseManager } from './databaseManager'
import { queueManager } from './queueManager'

export const infrastructureManager = {
	async initialize(): Promise<void> {
		logger.info('Initializing all infrastructure services...')
		await databaseManager.initialize()
		await queueManager.initialize()
		logger.info('All infrastructure services initialized successfully.')
	},

	async shutdown(): Promise<void> {
		logger.info('Shutting down all infrastructure services...')
		await databaseManager.shutdown()
		await queueManager.shutdown()
		logger.info('All infrastructure services shut down successfully.')
	}
}
