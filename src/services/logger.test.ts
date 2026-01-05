describe('logger', () => {
	beforeEach(() => {
		jest.resetModules()
	})

	it('should configure logger for production environment', () => {
		jest.doMock('@/services/config', () => ({
			config: {
				get: (key: string) => (key === 'env' ? 'production' : undefined)
			}
		}))

		const logger = require('./logger').default

		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe('function')
		expect(typeof logger.error).toBe('function')
	})

	it('should configure logger with pino-pretty for development environment', () => {
		jest.doMock('@/services/config', () => ({
			config: {
				get: (key: string) => (key === 'env' ? 'development' : undefined)
			}
		}))

		const logger = require('./logger').default

		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe('function')
	})

	it('should configure logger with pino-pretty for test environment', () => {
		jest.doMock('@/services/config', () => ({
			config: {
				get: (key: string) => (key === 'env' ? 'test' : undefined)
			}
		}))

		const logger = require('./logger').default

		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe('function')
	})
})
