import { providerManager } from './providerManager'
import { Bullmq } from './providers/Bullmq'
import { Mongo } from './providers/Mongo'
import { Postgres } from './providers/Postgres'
import { Redis } from './providers/Redis'

jest.mock('./providers/Postgres')
jest.mock('./providers/Redis')
jest.mock('./providers/Mongo')
jest.mock('./providers/Bullmq')
jest.mock('../services/logger', () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}))

describe('providerManager', () => {
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
		;(Bullmq as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: disconnectMock,
			displayName: 'Queue'
		}))
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('should initialize providers and store instances', async () => {
		await providerManager.initialize(['postgres', 'redis'])
		expect(providerManager.get('postgres')).toEqual({ client: 'instance' })
		expect(providerManager.get('redis')).toEqual({ client: 'instance' })
	})

	it('should throw if provider key not found in registry', async () => {
		jest.resetModules()
		const { providerManager } = await import('./providerManager')

		await expect(
			providerManager.initialize(['invalidProvider' as any])
		).rejects.toThrow(/Provider "invalidProvider" not found in registry/)
	})

	it('should throw if provider connect fails', async () => {
		jest.resetModules()
		const { providerManager } = await import('./providerManager')
		const { Postgres } = await import('./providers/Postgres')

		const connectMock = jest.fn().mockRejectedValueOnce(new Error('fail'))
		;(Postgres as jest.Mock).mockImplementation(() => ({
			connect: connectMock,
			disconnect: jest.fn(),
			displayName: 'PostgreSQL'
		}))

		await expect(providerManager.initialize(['postgres'])).rejects.toThrow(
			/Failed to initialize PostgreSQL/
		)
	})

	it('should shutdown providers and clear instances', async () => {
		await providerManager.initialize(['postgres', 'redis'])
		await providerManager.shutdown()
		expect(disconnectMock).toHaveBeenCalledTimes(2)
		expect(() => providerManager.get('postgres')).toThrow(/not initialized/)
	})

	it('get should throw if provider not initialized', () => {
		expect(() => providerManager.get('postgres')).toThrow(/not initialized/)
	})

	it('getAll should throw if any provider not initialized', async () => {
		await providerManager.initialize(['postgres'])
		expect(() => providerManager.getAll()).toThrow(/not initialized/)
	})

	it('getAll should return all instances', async () => {
		await providerManager.initialize(['postgres', 'redis', 'mongo', 'queue'])
		const all = providerManager.getAll()
		expect(Object.keys(all)).toEqual(['postgres', 'redis', 'mongo', 'queue'])
		expect(all.postgres).toEqual({ client: 'instance' })
	})

	it('getDbClients should return only DB instances', async () => {
		await providerManager.initialize(['postgres', 'redis', 'mongo', 'queue'])
		const dbClients = providerManager.getDbClients()
		expect(dbClients).toEqual({
			postgres: { client: 'instance' },
			redis: { client: 'instance' },
			mongo: { client: 'instance' }
		})
	})

	it('should initialize providers and store instances by default', async () => {
		await providerManager.initialize()
		expect(providerManager.get('postgres')).toEqual({ client: 'instance' })
		expect(providerManager.get('redis')).toEqual({ client: 'instance' })
	})
})
