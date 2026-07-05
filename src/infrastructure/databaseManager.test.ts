import { Mock, vi } from 'vitest'

type ProviderKey = 'postgres' | 'redis' | 'mongo'

type SetupOptions = {
	configuredProviders?: ProviderKey[] | undefined
	failConnect?: ProviderKey
	failDisconnect?: ProviderKey
}

const loggerMock = {
	info: vi.fn(),
	warn: vi.fn(),
	error: vi.fn()
}

const defaultDbConfig = {
	postgres: { url: 'postgres://localhost/test' },
	redis: { host: 'localhost', port: 6379, db: 0, password: '' },
	mongo: { url: 'mongodb://localhost:27017', db: 'test-db' }
}

const setupDatabaseManager = async (options: SetupOptions = {}) => {
	vi.resetModules()
	vi.clearAllMocks()

	const connectMocks: Record<ProviderKey, Mock> = {
		postgres: vi.fn().mockResolvedValue({ client: 'instance' }),
		redis: vi.fn().mockResolvedValue({ client: 'instance' }),
		mongo: vi.fn().mockResolvedValue({ client: 'instance' })
	}

	const disconnectMocks: Record<ProviderKey, Mock> = {
		postgres: vi.fn().mockResolvedValue(undefined),
		redis: vi.fn().mockResolvedValue(undefined),
		mongo: vi.fn().mockResolvedValue(undefined)
	}

	if (options.failConnect) {
		connectMocks[options.failConnect].mockRejectedValue(
			new Error('connect-fail')
		)
	}

	if (options.failDisconnect) {
		disconnectMocks[options.failDisconnect].mockRejectedValue(
			new Error('disconnect-fail')
		)
	}

	vi.doMock('./providers/Postgres', () => ({
		Postgres: vi.fn(function () {
			return {
				connect: connectMocks.postgres,
				disconnect: disconnectMocks.postgres,
				displayName: 'PostgreSQL'
			}
		})
	}))

	vi.doMock('./providers/Redis', () => ({
		Redis: vi.fn(function () {
			return {
				connect: connectMocks.redis,
				disconnect: disconnectMocks.redis,
				displayName: 'Redis'
			}
		})
	}))

	vi.doMock('./providers/Mongo', () => ({
		Mongo: vi.fn(function () {
			return {
				connect: connectMocks.mongo,
				disconnect: disconnectMocks.mongo,
				displayName: 'MongoDB'
			}
		})
	}))

	vi.doMock('@/services/logger', () => ({
		__esModule: true,
		default: loggerMock
	}))

	vi.doMock('@/services/config', () => ({
		config: {
			get: (key: string) => {
				if (key === 'database.providers') return options.configuredProviders
				if (key === 'database.postgres') return defaultDbConfig.postgres
				if (key === 'database.redis') return defaultDbConfig.redis
				if (key === 'database.mongo') return defaultDbConfig.mongo
				return undefined
			}
		}
	}))

	const mod = await import('./databaseManager')

	return {
		databaseManager: mod.databaseManager,
		resetDatabaseManager: mod.resetDatabaseManager,
		connectMocks,
		disconnectMocks
	}
}

describe('databaseManager', () => {
	afterEach(async () => {
		try {
			const mod = await import('./databaseManager')
			await mod.resetDatabaseManager()
		} catch {
			// Ignore cleanup errors when module was not loaded in the test.
		}
	})

	it('falls back to PROVIDERS when config.database.providers is undefined', async () => {
		const { databaseManager, connectMocks } = await setupDatabaseManager({
			configuredProviders: undefined
		})

		await databaseManager.initialize()
		expect(connectMocks.postgres).toHaveBeenCalledTimes(1)
		expect(connectMocks.redis).toHaveBeenCalledTimes(1)
		expect(connectMocks.mongo).toHaveBeenCalledTimes(1)

		const all = databaseManager.getAll()
		expect(Object.keys(all).sort()).toEqual(
			['postgres', 'redis', 'mongo'].sort()
		)
	})

	it('respects configured providers when config.database.providers is set', async () => {
		const { databaseManager, connectMocks } = await setupDatabaseManager({
			configuredProviders: ['postgres', 'mongo']
		})

		await databaseManager.initialize()
		expect(connectMocks.postgres).toHaveBeenCalledTimes(1)
		expect(connectMocks.mongo).toHaveBeenCalledTimes(1)
		expect(connectMocks.redis).not.toHaveBeenCalled()

		const all = databaseManager.getAll()
		expect(Object.keys(all).sort()).toEqual(['postgres', 'mongo'].sort())
	})

	it('shutdown logs a warning when disconnect throws', async () => {
		const { databaseManager, disconnectMocks } = await setupDatabaseManager({
			failDisconnect: 'postgres'
		})

		await databaseManager.initialize()
		await databaseManager.shutdown()

		expect(disconnectMocks.postgres).toHaveBeenCalled()
		expect(loggerMock.warn).toHaveBeenCalled()
		expect(String(loggerMock.warn.mock.calls[0][0])).toContain(
			'error disconnecting postgres'
		)
	})

	it('should cleanup started providers and ignore disconnect errors on init failure', async () => {
		const { databaseManager, disconnectMocks } = await setupDatabaseManager({
			failConnect: 'redis',
			failDisconnect: 'postgres'
		})

		await expect(databaseManager.initialize()).rejects.toThrow(
			/Failed to initialize providers:/
		)

		expect(disconnectMocks.postgres).toHaveBeenCalled()
	})

	it('should initialize providers and store instances', async () => {
		const { databaseManager } = await setupDatabaseManager()

		await databaseManager.initialize()
		expect(databaseManager.get('postgres')).toEqual({ client: 'instance' })
		expect(databaseManager.get('redis')).toEqual({ client: 'instance' })
		expect(databaseManager.get('mongo')).toEqual({ client: 'instance' })
	})

	it('should not re-initialize providers if already connected', async () => {
		const { databaseManager, connectMocks } = await setupDatabaseManager()

		await databaseManager.initialize()
		expect(connectMocks.postgres).toHaveBeenCalledTimes(1)
		expect(connectMocks.redis).toHaveBeenCalledTimes(1)
		expect(connectMocks.mongo).toHaveBeenCalledTimes(1)

		await databaseManager.initialize()
		expect(connectMocks.postgres).toHaveBeenCalledTimes(1)
		expect(connectMocks.redis).toHaveBeenCalledTimes(1)
		expect(connectMocks.mongo).toHaveBeenCalledTimes(1)
	})

	it('should throw if provider connect fails', async () => {
		const { databaseManager } = await setupDatabaseManager({
			failConnect: 'postgres'
		})

		await expect(databaseManager.initialize()).rejects.toThrow(
			/DatabaseManager: Failed to initialize providers:/
		)
	})

	it('should shutdown providers and clear instances', async () => {
		const { databaseManager, disconnectMocks } = await setupDatabaseManager()

		await databaseManager.initialize()
		await databaseManager.shutdown()
		expect(disconnectMocks.postgres).toHaveBeenCalledTimes(1)
		expect(disconnectMocks.redis).toHaveBeenCalledTimes(1)
		expect(disconnectMocks.mongo).toHaveBeenCalledTimes(1)
		expect(() => databaseManager.get('postgres')).toThrow(/not initialized/)
	})

	it('should do nothing on shutdown if providers are not initialized', async () => {
		const { databaseManager, disconnectMocks } = await setupDatabaseManager()

		await databaseManager.shutdown()
		expect(disconnectMocks.postgres).not.toHaveBeenCalled()
		expect(disconnectMocks.redis).not.toHaveBeenCalled()
		expect(disconnectMocks.mongo).not.toHaveBeenCalled()
	})

	it('get should throw if provider not initialized', async () => {
		const { databaseManager } = await setupDatabaseManager()

		expect(() => databaseManager.get('postgres')).toThrow(/not initialized/)
	})

	it('getAll should throw if any provider not initialized', async () => {
		const { databaseManager } = await setupDatabaseManager()

		expect(() => databaseManager.getAll()).toThrow(/not initialized/)
	})

	it('getAll should return all instances', async () => {
		const { databaseManager } = await setupDatabaseManager()

		await databaseManager.initialize()
		const all = databaseManager.getAll()
		expect(Object.keys(all).sort()).toEqual(
			['postgres', 'redis', 'mongo'].sort()
		)
		expect(all.postgres).toEqual({ client: 'instance' })
	})

	it('getInitialized and getStatus reflect state before/after initialize', async () => {
		const { databaseManager } = await setupDatabaseManager()

		const statusBefore = databaseManager.getStatus()
		expect(statusBefore.postgres.initialized).toBe(false)
		expect(statusBefore.redis.initialized).toBe(false)
		expect(statusBefore.mongo.initialized).toBe(false)

		expect(databaseManager.getInitialized()).toEqual({})

		await databaseManager.initialize()
		const statusAfter = databaseManager.getStatus()
		expect(statusAfter.postgres.initialized).toBe(true)
		expect(statusAfter.redis.initialized).toBe(true)
		expect(statusAfter.mongo.initialized).toBe(true)

		const initialized = databaseManager.getInitialized()
		expect(Object.keys(initialized).sort()).toEqual(
			['mongo', 'postgres', 'redis'].sort()
		)
	})
})
