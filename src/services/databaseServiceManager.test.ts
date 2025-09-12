import {
	__resetForTests,
	databaseServiceManager
} from './databaseServiceManager'
import { mongoService } from './mongoService'
import { prismaService } from './prismaService'
import { redisService } from './redisService'

jest.mock('./logger', () => ({
	info: jest.fn(),
	error: jest.fn()
}))

describe('databaseServiceManager', () => {
	beforeEach(() => {
		jest.clearAllMocks()
		__resetForTests()
	})

	it('Should connect all enabled services', async () => {
		const mockPrisma = {} as any
		const mockRedis = {} as any
		const mockMongo = {} as any

		jest.spyOn(prismaService, 'connect').mockResolvedValue(mockPrisma)
		jest.spyOn(redisService, 'connect').mockResolvedValue(mockRedis)
		jest.spyOn(mongoService, 'connect').mockResolvedValue(mockMongo)

		await databaseServiceManager.initialize()

		expect(prismaService.connect).toHaveBeenCalled()
		expect(redisService.connect).toHaveBeenCalled()
		expect(mongoService.connect).toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.prisma).toBe(mockPrisma)
		expect(dbs.redis).toBe(mockRedis)
		expect(dbs.mongo).toBe(mockMongo)
	})

	it('Should skip disabled services (connect returns null)', async () => {
		jest.spyOn(prismaService, 'connect').mockResolvedValue(null)
		jest.spyOn(redisService, 'connect').mockResolvedValue({} as any)
		jest.spyOn(mongoService, 'connect').mockResolvedValue(null)

		await databaseServiceManager.initialize()

		expect(prismaService.connect).toHaveBeenCalled()
		expect(redisService.connect).toHaveBeenCalled()
		expect(mongoService.connect).toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.prisma).toBeUndefined()
		expect(dbs.redis).toBeDefined()
		expect(dbs.mongo).toBeUndefined()
	})

	it('Should throw error if Prisma connection fails', async () => {
		jest
			.spyOn(prismaService, 'connect')
			.mockRejectedValue(new Error('prisma-fail'))
		jest.spyOn(redisService, 'connect').mockResolvedValue(null)
		jest.spyOn(mongoService, 'connect').mockResolvedValue(null)

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			'Failed to initialize Prisma (PostgreSQL) client: prisma-fail'
		)
	})

	it('Should throw error if Redis connection fails', async () => {
		jest.spyOn(prismaService, 'connect').mockResolvedValue(null)
		jest
			.spyOn(redisService, 'connect')
			.mockRejectedValue(new Error('redis-fail'))
		jest.spyOn(mongoService, 'connect').mockResolvedValue(null)

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			'Failed to initialize Redis client: redis-fail'
		)
	})

	it('Should throw error if MongoDB connection fails', async () => {
		jest.spyOn(prismaService, 'connect').mockResolvedValue(null)
		jest.spyOn(redisService, 'connect').mockResolvedValue(null)
		jest
			.spyOn(mongoService, 'connect')
			.mockRejectedValue(new Error('mongo-fail'))

		await expect(databaseServiceManager.initialize()).rejects.toThrow(
			'Failed to initialize MongoDB client: mongo-fail'
		)
	})

	it('Should skip re-initialization if service already connected', async () => {
		const mockPrisma = {} as any
		const spyConnect = jest
			.spyOn(prismaService, 'connect')
			.mockResolvedValue(mockPrisma)
		jest.spyOn(redisService, 'connect').mockResolvedValue(null)
		jest.spyOn(mongoService, 'connect').mockResolvedValue(null)

		await databaseServiceManager.initialize()
		await databaseServiceManager.initialize() // second call

		expect(spyConnect).toHaveBeenCalledTimes(1) // second call returns existing client
		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.prisma).toBe(mockPrisma)
	})

	it('Should shutdown only initialized services', async () => {
		const mockPrisma = {} as any
		const mockMongo = {} as any

		jest.spyOn(prismaService, 'connect').mockResolvedValue(mockPrisma)
		jest.spyOn(prismaService, 'disconnect').mockResolvedValue()
		jest.spyOn(redisService, 'connect').mockResolvedValue(null)
		jest.spyOn(redisService, 'disconnect').mockResolvedValue()
		jest.spyOn(mongoService, 'connect').mockResolvedValue(mockMongo)
		jest.spyOn(mongoService, 'disconnect').mockResolvedValue()

		await databaseServiceManager.initialize()
		await databaseServiceManager.shutdown()

		expect(prismaService.disconnect).toHaveBeenCalled()
		expect(redisService.disconnect).not.toHaveBeenCalled()
		expect(mongoService.disconnect).toHaveBeenCalled()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.prisma).toBeUndefined()
		expect(dbs.redis).toBeUndefined()
		expect(dbs.mongo).toBeUndefined()
	})

	it('Should handle connect returning null without logging success', async () => {
		const mockInfo = jest.spyOn(require('./logger'), 'info')
		jest.spyOn(prismaService, 'connect').mockResolvedValue(null)
		jest.spyOn(redisService, 'connect').mockResolvedValue(null)
		jest.spyOn(mongoService, 'connect').mockResolvedValue(null)

		await databaseServiceManager.initialize()

		// Should not log success if client is null
		expect(mockInfo).not.toHaveBeenCalledWith(
			expect.stringContaining('connected successfully')
		)
	})

	it('Should reset internal state for tests', async () => {
		const spyPrismaReset = jest.spyOn(prismaService, '__resetForTests')
		const spyRedisReset = jest.spyOn(redisService, '__resetForTests')
		const spyMongoReset = jest.spyOn(mongoService, '__resetForTests')

		await databaseServiceManager.initialize()
		__resetForTests()

		const dbs = databaseServiceManager.getDatabases()
		expect(dbs.prisma).toBeUndefined()
		expect(dbs.redis).toBeUndefined()
		expect(dbs.mongo).toBeUndefined()

		expect(spyPrismaReset).toHaveBeenCalled()
		expect(spyRedisReset).toHaveBeenCalled()
		expect(spyMongoReset).toHaveBeenCalled()
	})
})
