import config from './config'
import {
	__resetForTests,
	databaseServiceManager
} from './databaseServiceManager'
import { mongoService } from './mongoService'
import { prismaService } from './prismaService'
import { redisService } from './redisService'

jest.mock('./logger', () => ({
	info: jest.fn(),
	error: jest.fn(),
	warn: jest.fn()
}))

jest.mock('./config', () => ({
	has: jest.fn(),
	get: jest.fn()
}))

describe('databaseServiceManager', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		__resetForTests()
		;(config.has as jest.Mock).mockReturnValue(true)
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'database.providers.business') return 'postgres'
			if (key === 'database.providers.cache') return 'redis'
			if (key === 'database.providers.log') return 'mongo'
			// config values used by services if needed
			if (key === 'database.postgres') return { url: 'postgres://test' }
			if (key === 'database.redis')
				return { host: 'localhost', port: 6379, db: 0, password: null }
			if (key === 'database.mongo')
				return { url: 'mongodb://localhost:27017', db: 'testdb' }
			return undefined
		})

		jest
			.spyOn(prismaService, 'connect')
			.mockResolvedValue({ client: 'prisma' } as any)
		jest
			.spyOn(redisService, 'connect')
			.mockResolvedValue({ client: 'redis' } as any)
		jest
			.spyOn(mongoService, 'connect')
			.mockResolvedValue({ client: 'mongo' } as any)

		jest.spyOn(prismaService, 'disconnect').mockResolvedValue()
		jest.spyOn(redisService, 'disconnect').mockResolvedValue()
		jest.spyOn(mongoService, 'disconnect').mockResolvedValue()

		jest.spyOn(prismaService, '__resetForTests').mockImplementation(() => {})
		jest.spyOn(redisService, '__resetForTests').mockImplementation(() => {})
		jest.spyOn(mongoService, '__resetForTests').mockImplementation(() => {})
	})

	it('should throw if a required provider is missing (config.has === false)', async () => {
		;(config.has as jest.Mock).mockImplementation((key: string) =>
			key === 'database.providers.business' ? false : true
		)

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			"Critical error: The required database provider for 'business' is not configured."
		)
	})

	it("should throw if a required provider is set to 'none'", async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'database.providers.business') return 'none'
			if (key === 'database.providers.cache') return 'redis'
			if (key === 'database.providers.log') return 'mongo'
			return undefined
		})

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			"Critical error: The required database provider for 'business' is not configured."
		)
	})

	it('should connect all enabled services', async () => {
		await databaseServiceManager.initialize()

		expect(prismaService.connect).toHaveBeenCalled()
		expect(redisService.connect).toHaveBeenCalled()
		expect(mongoService.connect).toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.postgres).toEqual({ client: 'prisma' })
		expect(dbs.redis).toEqual({ client: 'redis' })
		expect(dbs.mongo).toEqual({ client: 'mongo' })
	})

	it('should skip initializing a provider by mapping it to another provider (e.g. cache -> postgres)', async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'database.providers.business') return 'postgres'
			if (key === 'database.providers.cache') return 'postgres'
			if (key === 'database.providers.log') return 'mongo'
			if (key === 'database.postgres') return { url: 'postgres://test' }
			if (key === 'database.mongo')
				return { url: 'mongodb://localhost:27017', db: 'testdb' }
			return undefined
		})

		await databaseServiceManager.initialize()

		expect(prismaService.connect).toHaveBeenCalled()
		expect(mongoService.connect).toHaveBeenCalled()
		expect(redisService.connect).not.toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.postgres).toBeDefined()
		expect(dbs.mongo).toBeDefined()
		expect(dbs.redis).toBeUndefined()
	})

	it('should throw the correct error if prisma connect fails', async () => {
		;(
			prismaService.connect as unknown as jest.SpyInstance
		).mockRejectedValueOnce(new Error('prisma-fail'))

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			'Failed to initialize PostgreSQL (Prisma) client: prisma-fail'
		)
	})

	it('should throw the correct error if redis connect fails', async () => {
		;(
			prismaService.connect as unknown as jest.SpyInstance
		).mockResolvedValueOnce({
			client: 'prisma'
		})
		;(
			redisService.connect as unknown as jest.SpyInstance
		).mockRejectedValueOnce(new Error('redis-fail'))

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			'Failed to initialize Redis client: redis-fail'
		)
	})

	it('should throw the correct error if mongo connect fails', async () => {
		;(
			prismaService.connect as unknown as jest.SpyInstance
		).mockResolvedValueOnce({
			client: 'prisma'
		})
		;(
			redisService.connect as unknown as jest.SpyInstance
		).mockResolvedValueOnce({
			client: 'redis'
		})
		;(
			mongoService.connect as unknown as jest.SpyInstance
		).mockRejectedValueOnce(new Error('mongo-fail'))

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			'Failed to initialize MongoDB client: mongo-fail'
		)
	})

	it('should skip re-initialization if service already connected (initialize called twice)', async () => {
		const spyConnect = prismaService.connect as unknown as jest.SpyInstance

		await databaseServiceManager.initialize()
		await databaseServiceManager.initialize()

		expect(spyConnect).toHaveBeenCalledTimes(1)
		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.postgres).toBeDefined()
	})

	it('should shutdown only initialized services', async () => {
		;(config.get as jest.Mock).mockImplementation((key: string) => {
			if (key === 'database.providers.business') return 'postgres'
			if (key === 'database.providers.cache') return 'postgres'
			if (key === 'database.providers.log') return 'mongo'
			if (key === 'database.postgres') return { url: 'postgres://test' }
			if (key === 'database.mongo')
				return { url: 'mongodb://localhost:27017', db: 'testdb' }
			return undefined
		})

		const spyPrismaDisconnect =
			prismaService.disconnect as unknown as jest.SpyInstance
		const spyRedisDisconnect =
			redisService.disconnect as unknown as jest.SpyInstance
		const spyMongoDisconnect =
			mongoService.disconnect as unknown as jest.SpyInstance

		await databaseServiceManager.initialize()
		await databaseServiceManager.shutdown()

		expect(spyPrismaDisconnect).toHaveBeenCalled()
		expect(spyMongoDisconnect).toHaveBeenCalled()
		expect(spyRedisDisconnect).not.toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.postgres).toBeUndefined()
		expect(dbs.redis).toBeUndefined()
		expect(dbs.mongo).toBeUndefined()
	})

	it('should call __resetForTests on each service and clear registry', async () => {
		const spyPrismaReset =
			prismaService.__resetForTests as unknown as jest.SpyInstance
		const spyRedisReset =
			redisService.__resetForTests as unknown as jest.SpyInstance
		const spyMongoReset =
			mongoService.__resetForTests as unknown as jest.SpyInstance

		await databaseServiceManager.initialize()
		__resetForTests()

		expect(spyPrismaReset).toHaveBeenCalled()
		expect(spyRedisReset).toHaveBeenCalled()
		expect(spyMongoReset).toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.postgres).toBeUndefined()
		expect(dbs.redis).toBeUndefined()
		expect(dbs.mongo).toBeUndefined()
	})
})
