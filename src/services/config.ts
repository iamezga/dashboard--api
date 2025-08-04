import convict from 'convict'

const config = convict({
	appName: {
		format: String,
		env: 'APP_NAME',
		default: 'my-app-name'
	},
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
	},
	database: {
		mongo: {
			enabled: {
				doc: 'Enable MongoDB connection.',
				format: Boolean,
				default: false,
				env: 'MONGO_ENABLED'
			},
			url: {
				doc: 'MongoDB connection URL.',
				format: String,
				default: '',
				env: 'MONGO_URL',
				sensitive: true // Mark as sensitive to avoid logging in plaintext
			},
			db: {
				doc: 'MongoDB db name.',
				format: String,
				default: '',
				env: 'MONGO_DB_NAME',
				sensitive: true
			}
		},
		prisma: {
			enabled: {
				doc: 'Enable Prisma ORM connection (requires DATABASE_URL for Prisma Client).',
				format: Boolean,
				default: false,
				env: 'PRISMA_ENABLED'
			},
			url: {
				doc: 'PostgreSQL connection URL.',
				format: String,
				default: '',
				env: 'PRISMA_URL',
				sensitive: true
			}
		},
		redis: {
			enabled: {
				doc: 'Enable Redis connection.',
				format: Boolean,
				default: false,
				env: 'REDIS_ENABLED'
			},
			host: {
				doc: 'Redis host.',
				format: String,
				default: 'localhost',
				env: 'REDIS_HOST'
			},
			port: {
				doc: 'Redis port.',
				format: Number,
				default: 6379,
				env: 'REDIS_PORT'
			},
			password: {
				doc: 'Redis password.',
				format: String,
				default: '',
				env: 'REDIS_PASSWORD',
				sensitive: true
			},
			db: {
				doc: 'Redis DB index.',
				format: Number,
				default: 0,
				env: 'REDIS_DB'
			}
		}
	}
})

config.validate({ allowed: 'strict' })

export default config
export type Config = typeof config
