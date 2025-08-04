import config from '@/services/config'
import logger from '@/services/logger'
import { app } from './http/app'
import databaseServiceManager from './services/databaseServiceManager'
;(async () => {
	try {
		// connect databases
		await databaseServiceManager.initialize()
		// Run server
		app.listen(config.get('port') || 5000, () =>
			logger.info(`Running on port ${config.get('port')}`)
		)

		// Process listeners to prevent opened connections
		process.on('SIGTERM', async () => {
			logger.info('SIGTERM signal received. Shutting down gracefully.')
			await databaseServiceManager.shutdown() // disconnect databases
			process.exit(0)
		})

		process.on('SIGINT', async () => {
			logger.info('SIGINT signal received. Shutting down gracefully.')
			await databaseServiceManager.shutdown()
			process.exit(0)
		})
	} catch (error: any) {
		logger.error(`Failed to start application: ${error.message}`)
		await databaseServiceManager.shutdown()
		process.exit(1)
	}
})()
