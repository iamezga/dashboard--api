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
			'DatabaseManager: Failed to initialize PostgreSQL: fail'
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
		expect(Object.keys(all)).toEqual(['postgres', 'redis', 'mongo'])
		expect(all.postgres).toEqual({ client: 'instance' })
	})
})
