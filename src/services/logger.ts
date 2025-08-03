import config from '@/services/config'
import pino from 'pino'

const pinoConfig: pino.LoggerOptions = {
	level: config.get('env') === 'production' ? 'info' : 'debug',

	transport:
		config.get('env') === 'development' || config.get('env') === 'test'
			? {
					target: 'pino-pretty',
					options: {
						colorize: true,
						translateTime: 'SYS:HH:MM:ss Z',
						ignore: 'pid,hostname'
					}
				}
			: undefined,

	base: {
		app: config.get('appName')
	},
	redact: {
		paths: ['req.headers.authorization', 'body.password'],
		censor: '[REDACTED]'
	}
}

const logger = pino(pinoConfig)
export default logger
