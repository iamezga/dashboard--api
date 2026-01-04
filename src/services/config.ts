import convict from 'convict'

export const config = convict({
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
	front: {
		url: {
			doc: 'Frontend application URL for emails and redirects',
			format: String,
			env: 'FRONT_URL',
			default: 'http://localhost:3000'
		}
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
		/** List of active database providers for this project. Order is not relevant. */
		providers: {
			format: Array,
			default: ['postgres', 'redis', 'mongo'],
			env: 'DATABASE_PROVIDERS'
		},
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
	audit: {
		provider: {
			doc: 'Audit repository provider. Must be "postgres" or "mongo" and set via env AUDIT_PROVIDER',
			format: String,
			env: 'AUDIT_PROVIDER',
			default: ''
		}
	},
	email: {
		provider: {
			format: ['log', 'nodemailer'],
			default: 'log',
			env: 'EMAIL_PROVIDER'
		},
		supportEmail: {
			format: String,
			default: 'support@example.com',
			env: 'SUPPORT_EMAIL'
		},
		nodemailer: {
			host: {
				format: String,
				default: '',
				env: 'SMTP_HOST'
			},
			port: {
				format: 'port',
				default: 587,
				env: 'SMTP_PORT'
			},
			secure: {
				format: Boolean,
				default: false,
				env: 'SMTP_SECURE'
			},
			auth: {
				user: {
					format: String,
					default: '',
					env: 'SMTP_USER'
				},
				pass: {
					format: String,
					default: '',
					env: 'SMTP_PASS',
					sensitive: true
				}
			},
			from: {
				format: String,
				default: 'noreply@example.com',
				env: 'SMTP_FROM'
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

export type Config = typeof config
