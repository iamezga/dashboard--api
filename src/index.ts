import { config } from '@/services/config'
import logger from '@/services/logger'
import { app } from './http/app'
import { infrastructureManager } from './infrastructure'

const shutdown = async (signal: string) => {
	logger.info(`${signal} signal received. Shutting down gracefully.`)
	await infrastructureManager.shutdown()
	process.exit(1)
}

;(async () => {
	try {
		// Connect and initialize all services
		await infrastructureManager.initialize()

		// Run server
		app.listen(config.get('port') || 5000, () =>
			logger.info(`Running on port ${config.get('port')}`)
		)

		// Process listeners for graceful shutdown
		process.on('SIGTERM', () => shutdown('SIGTERM'))
		process.on('SIGINT', () => shutdown('SIGINT'))
	} catch (error: any) {
		logger.error(`Failed to start application: ${error.message}`)
		await infrastructureManager.shutdown()
		process.exit(1)
	}
})()
