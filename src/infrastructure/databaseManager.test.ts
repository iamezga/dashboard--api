jest.mock('./providers/Postgres')
jest.mock('./providers/Redis')
jest.mock('./providers/Mongo')
jest.mock('@/services/logger', () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}))

describe('databaseManager', () => {
	let databaseManager: any
	let Postgres: any
	let Redis: any
	let Mongo: any
	let connectMock: jest.Mock
	let disconnectMock: jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()
		jest.resetModules() // Crucial: Resets module cache before each test
		connectMock = jest.fn().mockResolvedValue({ client: 'instance' })
		disconnectMock = jest.fn().mockResolvedValue(undefined)

		// Re-import mocked classes
		Postgres = require('./providers/Postgres').Postgres
		Redis = require('./providers/Redis').Redis
		Mongo = require('./providers/Mongo').Mongo
		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'PostgreSQL'
		}))
		;(Redis as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'Redis'
		}))
		;(Mongo as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'MongoDB'
		}))

		// Import the module under test AFTER mocks are set up
		databaseManager = require('./databaseManager').databaseManager
	})

	it('falls back to PROVIDERS when config.database.providers is undefined', async () => {
		jest.clearAllMocks()
		jest.resetModules()

		// Spy on the real config.get to return undefined for database.providers
		const cfg = require('@/services/config').config
		const originalGet = cfg.get.bind(cfg)
		;(jest.spyOn as any)(cfg, 'get').mockImplementation((key: string) =>
			key === 'database.providers' ? undefined : originalGet(key)
		)

		const connectMock = jest.fn().mockResolvedValue({ client: 'instance' })
		const disconnectMock = jest.fn().mockResolvedValue(undefined)

		const Postgres = require('./providers/Postgres').Postgres
		const Redis = require('./providers/Redis').Redis
		const Mongo = require('./providers/Mongo').Mongo

		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'PostgreSQL'
		}))
		;(Redis as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'Redis'
		}))
		;(Mongo as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'MongoDB'
		}))

		const { databaseManager: dbm } = require('./databaseManager')

		await dbm.initialize()
		expect(connectMock).toHaveBeenCalledTimes(3)
		const all = dbm.getAll()
		expect(Object.keys(all).sort()).toEqual(
			['postgres', 'redis', 'mongo'].sort()
		)
	})

	it('respects configured providers when config.database.providers is set', async () => {
		jest.clearAllMocks()
		jest.resetModules()

		// Spy on the real config.get to return a subset for database.providers
		const cfg = require('@/services/config').config
		const originalGet = cfg.get.bind(cfg)
		;(jest.spyOn as any)(cfg, 'get').mockImplementation((key: string) =>
			key === 'database.providers'
				? (['postgres', 'mongo'] as any)
				: originalGet(key)
		)

		const connectMock = jest.fn().mockResolvedValue({ client: 'instance' })
		const disconnectMock = jest.fn().mockResolvedValue(undefined)

		const Postgres = require('./providers/Postgres').Postgres
		const Redis = require('./providers/Redis').Redis
		const Mongo = require('./providers/Mongo').Mongo

		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'PostgreSQL'
		}))
		;(Redis as jest.Mock).mockImplementation(() => ({
			connect: jest.fn().mockResolvedValue({}),
			disconnect: disconnectMock,
			displayName: 'Redis'
		}))
		;(Mongo as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'MongoDB'
		}))

		const { databaseManager: dbm } = require('./databaseManager')

		await dbm.initialize()
		expect(connectMock).toHaveBeenCalledTimes(2)
		const all = dbm.getAll()
		expect(Object.keys(all).sort()).toEqual(['postgres', 'mongo'].sort())
	})

	it('shutdown logs a warning when disconnect throws', async () => {
		jest.clearAllMocks()
		jest.resetModules()

		const connectMock = jest.fn().mockResolvedValue({ client: 'instance' })
		const disconnectOk = jest.fn().mockResolvedValue(undefined)
		const disconnectThrow = jest
			.fn()
			.mockRejectedValue(new Error('disconnect-fail'))

		const Postgres = require('./providers/Postgres').Postgres
		const Redis = require('./providers/Redis').Redis
		const Mongo = require('./providers/Mongo').Mongo

		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectThrow,
			displayName: 'PostgreSQL'
		}))
		;(Redis as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectOk,
			displayName: 'Redis'
		}))
		;(Mongo as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectOk,
			displayName: 'MongoDB'
		}))

		const { databaseManager: dbm } = require('./databaseManager')

		await dbm.initialize()
		await dbm.shutdown()

		const logger = require('@/services/logger')
		expect(disconnectThrow).toHaveBeenCalled()
		expect(logger.warn).toHaveBeenCalled()
		expect(String(logger.warn.mock.calls[0][0])).toContain(
			'error disconnecting postgres'
		)
	})

	it('should cleanup started providers and ignore disconnect errors on init failure', async () => {
		jest.clearAllMocks()
		jest.resetModules()

		const connectOk = jest.fn().mockResolvedValue({ client: 'instance' })
		const connectFail = jest.fn().mockRejectedValue(new Error('connect-fail'))
		const disconnectThrow = jest
			.fn()
			.mockRejectedValue(new Error('disconnect-fail'))

		// Re-import mocked classes with specific behavior
		const Postgres = require('./providers/Postgres').Postgres
		const Redis = require('./providers/Redis').Redis
		const Mongo = require('./providers/Mongo').Mongo

		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectOk,
			disconnect: disconnectThrow,
			displayName: 'PostgreSQL'
		}))
		;(Redis as jest.Mock).mockImplementation(() => ({
			connect: connectFail,
			disconnect: jest.fn(),
			displayName: 'Redis'
		}))
		;(Mongo as jest.Mock).mockImplementation(() => ({
			connect: connectOk,
			disconnect: jest.fn(),
			displayName: 'MongoDB'
		}))

		const { databaseManager: failingManager } = require('./databaseManager')

		await expect(failingManager.initialize()).rejects.toThrow(
			/Failed to initialize providers:/
		)

		// Ensure disconnect was attempted for the started provider (Postgres)
		expect(disconnectThrow).toHaveBeenCalled()
	})

	it('should initialize providers and store instances', async () => {
		await databaseManager.initialize()
		expect(databaseManager.get('postgres')).toEqual({ client: 'instance' })
		expect(databaseManager.get('redis')).toEqual({ client: 'instance' })
		expect(databaseManager.get('mongo')).toEqual({ client: 'instance' })
	})

	it('should not re-initialize providers if already connected', async () => {
		await databaseManager.initialize() // First call
		expect(connectMock).toHaveBeenCalledTimes(3)

		await databaseManager.initialize() // Second call
		// The connect mock should NOT be called again
		expect(connectMock).toHaveBeenCalledTimes(3)
	})

	it('should throw if provider connect fails', async () => {
		// Override the mock for this specific test
		connectMock.mockRejectedValue(new Error('fail'))
		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: jest.fn(),
			displayName: 'PostgreSQL'
		}))

		// Re-import with the failing mock
		const { databaseManager: failingManager } = require('./databaseManager')

		await expect(failingManager.initialize()).rejects.toThrow(
			/DatabaseManager: Failed to initialize providers:/
		)
	})

	it('should shutdown providers and clear instances', async () => {
		await databaseManager.initialize()
		await databaseManager.shutdown()
		expect(disconnectMock).toHaveBeenCalledTimes(3)
		expect(() => databaseManager.get('postgres')).toThrow(/not initialized/)
	})

	it('should do nothing on shutdown if providers are not initialized', async () => {
		await databaseManager.shutdown()
		expect(disconnectMock).not.toHaveBeenCalled()
	})

	it('get should throw if provider not initialized', () => {
		// No initialize() called, so it should fail
		expect(() => databaseManager.get('postgres')).toThrow(/not initialized/)
	})

	it('getAll should throw if any provider not initialized', async () => {
		// No initialize() called, so it should fail
		expect(() => databaseManager.getAll()).toThrow(/not initialized/)
	})

	it('getAll should return all instances', async () => {
		await databaseManager.initialize()
		const all = databaseManager.getAll()
		expect(Object.keys(all).sort()).toEqual(
			['postgres', 'redis', 'mongo'].sort()
		)
		expect(all.postgres).toEqual({ client: 'instance' })
	})

	it('getInitialized and getStatus reflect state before/after initialize', async () => {
		// Before init: none initialized
		const statusBefore = databaseManager.getStatus()
		expect(statusBefore.postgres.initialized).toBe(false)
		expect(statusBefore.redis.initialized).toBe(false)
		expect(statusBefore.mongo.initialized).toBe(false)

		expect(databaseManager.getInitialized()).toEqual({})

		// After init: all initialized
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
