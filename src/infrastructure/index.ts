import { config } from '@/services/config'
import logger from '@/services/logger'
import { databaseManager, Provider } from './databaseManager'
import { queueManager } from './queueManager'

export const infrastructureManager = {
	async initialize(): Promise<void> {
		logger.info('Initializing all infrastructure services...')
		await databaseManager.initialize()

		const auditProvider = config.get('audit.provider') as Provider

		try {
			databaseManager.get(auditProvider) // throws si no inicializado
		} catch (err) {
			logger.error(
				{ err },
				`Audit DB client (${auditProvider}) not initialized`
			)
			throw new Error(
				`Audit DB client "${auditProvider}" failed to initialize: ${
					(err as Error).message
				}`
			)
		}

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
