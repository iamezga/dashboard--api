import { vi } from 'vitest'

describe('logger', () => {
	beforeEach(() => {
		vi.resetModules()
	})

	async function loadLoggerForEnv(env: 'production' | 'development' | 'test') {
		vi.doMock('@/services/config', () => ({
			config: {
				get: (key: string) => (key === 'env' ? env : undefined)
			}
		}))

		const module = await import('./logger')
		return module.default
	}

	it('should configure logger for production environment', async () => {
		const logger = await loadLoggerForEnv('production')

		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe('function')
		expect(typeof logger.error).toBe('function')
	})

	it('should configure logger with pino-pretty for development environment', async () => {
		const logger = await loadLoggerForEnv('development')

		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe('function')
	})

	it('should configure logger with pino-pretty for test environment', async () => {
		const logger = await loadLoggerForEnv('test')

		expect(logger).toBeDefined()
		expect(typeof logger.info).toBe('function')
	})
})
