import convict from 'convict'

const config = convict({
	env: {
		format: ['production', 'development', 'test'],
		default: 'development',
		env: 'NODE_ENV'
	},
	port: {
		format: 'port',
		default: 5000,
		env: 'PORT',
		arg: 'port'
	},
	express: {
		requestBodySize: {
			format: String,
			env: 'EXPRESS_REQUEST_BODY_SIZE',
			default: '50mb'
		},
		corsOrigin: {
			doc: 'Origin domain for cors',
			format: String,
			env: 'EXPRESS_CORS_ORIGIN',
			default: '*'
		}
	},
	sentry: {
		dsn: {
			format: String,
			env: 'SENTRY_DSN',
			default: ''
		},
		tracesSampleRate: {
			format: Number,
			env: 'SENTRY_TRACES_SAMPLE_RATE',
			default: 1.0
		},
		profilesSampleRate: {
			format: Number,
			env: 'SENTRY_PROFILES_SAMPLE_RATE',
			default: 1.0
		}
	}
})

config.validate({ allowed: 'strict' })

export default config
export type Config = typeof config
