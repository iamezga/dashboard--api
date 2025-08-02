/* eslint-disable @typescript-eslint/no-unused-expressions */
import config from './config'

describe('Application Configuration', () => {
	const originalEnv = process.env

	beforeEach(() => {
		// Clean the module cache to reload config
		jest.resetModules()
		// Start each test with the original variables
		process.env = { ...originalEnv }
	})

	afterAll(() => {
		// reset env
		process.env = originalEnv
	})

	it('should load configuration successfully', () => {
		expect(config).toBeDefined()
	})

	it('should return default values when environment variables are not set', () => {
		// force default values
		delete process.env.NODE_ENV
		delete process.env.PORT
		// force reload config after change process.env
		const reloadedConfig = require('./config.ts').default

		expect(reloadedConfig.get('env')).toBe('development')
		expect(reloadedConfig.get('port')).toBe(5000)
	})

	it('should load values from environment variables', () => {
		process.env.NODE_ENV = 'production'
		process.env.PORT = '3000'
		const reloadedConfig = require('./config.ts').default

		expect(reloadedConfig.get('env')).toBe('production')
		expect(reloadedConfig.get('port')).toBe(3000)
	})

	it('should throw an error if an environment variable has an invalid format, even with a default', () => {
		process.env.PORT = 'invalid_port_string'

		expect(() => {
			require('./config.ts').default
		}).toThrow()

		expect(() => {
			require('./config.ts').default
		}).toThrow(/port: ports must be within range 0 - 65535/)
	})
})
