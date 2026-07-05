import { vi } from 'vitest'
import { config } from './config'

describe('Application Configuration', () => {
	const originalEnv = process.env

	beforeEach(() => {
		// Clean the module cache to reload config fresh
		vi.resetModules()
		process.env = { ...originalEnv }
	})

	afterAll(() => {
		process.env = originalEnv
	})

	it('should load configuration successfully', () => {
		expect(config).toBeDefined()
	})

	it('should return default values when environment variables are not set', async () => {
		delete process.env.NODE_ENV
		delete process.env.PORT

		// reload config
		const { config: reloadedConfig } = await import('./config')

		expect(reloadedConfig.get('env')).toBe('development')
		expect(reloadedConfig.get('port')).toBe(5000)
	})

	it('should load values from environment variables', async () => {
		process.env.NODE_ENV = 'production'
		process.env.PORT = '3000'

		const { config: reloadedConfig } = await import('./config')

		expect(reloadedConfig.get('env')).toBe('production')
		expect(reloadedConfig.get('port')).toBe(3000)
	})

	it('should throw an error if an environment variable has an invalid format, even with a default', async () => {
		process.env.PORT = 'invalid_port_string'

		await expect(async () => {
			await import('./config')
		}).rejects.toThrow(/port: ports must be within range 0 - 65535/)
	})
})
