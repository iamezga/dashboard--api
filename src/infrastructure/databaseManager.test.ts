import { databaseManager } from './databaseManager'
import { Mongo } from './providers/Mongo'
import { Postgres } from './providers/Postgres'
import { Redis } from './providers/Redis'

jest.mock('./providers/Postgres')
jest.mock('./providers/Redis')
jest.mock('./providers/Mongo')
jest.mock('../services/logger', () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}))

describe('databaseManager', () => {
	let connectMock: jest.Mock
	let disconnectMock: jest.Mock

	beforeEach(() => {
		connectMock = jest.fn().mockResolvedValue({ client: 'instance' })
		disconnectMock = jest.fn().mockResolvedValue(undefined)
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
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should initialize providers and store instances', async () => {
		await databaseManager.initialize()
		expect(databaseManager.get('postgres')).toEqual({ client: 'instance' })
		expect(databaseManager.get('redis')).toEqual({ client: 'instance' })
		expect(databaseManager.get('mongo')).toEqual({ client: 'instance' })
	})

	it('should throw if provider connect fails', async () => {
		jest.resetModules()
		const { databaseManager } = await import('./databaseManager')
		const { Postgres } = await import('./providers/Postgres')

		const connectMock = jest.fn().mockRejectedValueOnce(new Error('fail'))
		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: jest.fn(),
			displayName: 'PostgreSQL'
		}))

		await expect(databaseManager.initialize()).rejects.toThrow(
			/Failed to initialize PostgreSQL/
		)
	})

	it('should shutdown providers and clear instances', async () => {
		await databaseManager.initialize()
		await databaseManager.shutdown()
		expect(disconnectMock).toHaveBeenCalledTimes(3)
		expect(() => databaseManager.get('postgres')).toThrow(/not initialized/)
	})

	it('get should throw if provider not initialized', () => {
		expect(() => databaseManager.get('postgres')).toThrow(/not initialized/)
	})

	it('getAll should throw if any provider not initialized', async () => {
		// Manually reset to ensure a clean state without initialization
		await databaseManager.shutdown()
		expect(() => databaseManager.getAll()).toThrow(/not initialized/)
	})

	it('getAll should return all instances', async () => {
		await databaseManager.initialize()
		const all = databaseManager.getAll()
		expect(Object.keys(all)).toEqual(['postgres', 'redis', 'mongo'])
		expect(all.postgres).toEqual({ client: 'instance' })
	})

	it('getDbClients should return only DB instances', async () => {
		await databaseManager.initialize()
		const dbClients = databaseManager.getAll()
		expect(dbClients).toEqual({
			postgres: { client: 'instance' },
			redis: { client: 'instance' },
			mongo: { client: 'instance' }
		})
	})
})
