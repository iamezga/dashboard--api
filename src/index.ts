import config from '@/services/config'
import logger from '@/services/logger'
import { app } from './http/app'
;(async () => {
	// Run server
	app.listen(config.get('port') || 5000, () =>
		logger.info(`Running on port ${config.get('port')}`)
	)
})()
