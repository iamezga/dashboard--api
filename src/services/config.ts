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
		providers: {
			business: {
				doc: 'Database provider for core business data.',
				format: ['postgres', 'mysql', 'sqlite'], // Add supported databases
				default: 'postgres',
				env: 'BUSINESS_DB_PROVIDER'
			},
			cache: {
				doc: 'Database provider for caching and sessions.',
				format: ['redis', 'memcached', 'none'], // Use 'none' for an optional provider
				default: 'redis',
				env: 'CACHE_DB_PROVIDER'
			},
			log: {
				doc: 'Database provider for logs and audit events.',
				format: ['mongo', 'elastic', 'none'], // Use 'none' for an optional provider
				default: 'mongo',
				env: 'LOG_DB_PROVIDER'
			}
		},
		// The configurations for each database remain, but the `enabled` flag is gone.
		mongo: {
			url: {
				doc: 'MongoDB connection URL.',
				format: String,
				default: '',
				env: 'MONGO_URL',
				sensitive: true
			},
			db: {
				doc: 'MongoDB db name.',
				format: String,
				default: '',
				env: 'MONGO_DB_NAME',
				sensitive: true
			}
		},
		postgres: {
			url: {
				doc: 'PostgreSQL connection URL.',
				format: String,
				default: '',
				env: 'POSTGRES_URL',
				sensitive: true
			}
		},
		redis: {
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
	},
	jwt: {
		secret: {
			format: String,
			env: 'JWT_SECRET',
			default: ''
		},
		maxAge: {
			format: String,
			env: 'MAX_AGE',
			default: '1 day'
		},
		expiresIn: {
			format: String,
			env: 'JWT_EXPIRES_IN',
			default: '1 day'
		},
		passwordRecoverExpiresIn: {
			format: String,
			env: 'JWT_PASSWORD_RECOVER_EXPIRES_IN',
			default: '1 hour'
		}
	}
})

config.validate({ allowed: 'strict' })

export default config
export type Config = typeof config
