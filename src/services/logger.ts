import config from '@/services/config'
import pino from 'pino'

const isDev = ['development', 'debug', 'test'].includes(config.get('env'))

const pinoConfig: pino.LoggerOptions = {
	level: isDev ? 'debug' : 'info',
	transport: isDev
		? {
				target: 'pino-pretty',
				options: {
					colorize: true,
					translateTime: 'SYS:HH:MM:ss Z',
					ignore: 'pid,hostname'
				}
		  }
		: config.get('sentry.dsn')
		? {
				target: 'pino-sentry-transport',
				options: {
					sentry: {
						dsn: config.get('sentry.dsn'),
						environment: config.get('env')
					},
					withLogRecord: true,
					tags: ['level'],
					context: ['hostname'],
					minLevel: 40, // Only error and  fatal
					expectPinoConfig: true
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
