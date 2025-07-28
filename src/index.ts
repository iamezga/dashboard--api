import config from '@services/config'
import { app } from './http/app'
;(async () => {
	// Run server
	app.listen(config.get('port') || 5000, () =>
		console.log(`Running on port ${config.get('port')}`)
	)
})()
