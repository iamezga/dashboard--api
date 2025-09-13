import { Db, MongoClient } from 'mongodb'
import logger from './logger'
import { MongoService } from './mongoService'

jest.mock('mongodb')
jest.mock('./logger', () => ({
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn()
}))

describe('MongoService', () => {
	let service: MongoService
	let mockConnect: jest.Mock
	let mockDb: Db
	let mockClose: jest.Mock
	let mockOn: jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()

		mockConnect = jest.fn().mockResolvedValue(undefined)
		mockDb = {} as any
		mockClose = jest.fn().mockResolvedValue(undefined)
		mockOn = jest.fn()
		;(MongoClient as unknown as jest.Mock).mockImplementation(() => ({
			connect: mockConnect,
			db: jest.fn().mockReturnValue(mockDb),
			close: mockClose,
			on: mockOn
		}))

		service = new MongoService({
			url: 'mongodb://localhost:27017',
			db: 'test-db'
		} as any)
	})

	it('should connect successfully and return db instance', async () => {
		const db = await service.connect()
		expect(MongoClient).toHaveBeenCalledWith('mongodb://localhost:27017')
		expect(mockConnect).toHaveBeenCalled()
		expect(db).toBe(mockDb)
		expect(logger.info).toHaveBeenCalledWith('MongoDB connected successfully.')
	})

	it('should throw error if url or db not configured', async () => {
		service = new MongoService({} as any)
		await expect(service.connect()).rejects.toThrow(
			'MongoDB URL is not configured.'
		)
		service = new MongoService({ url: 'url' } as any)
		await expect(service.connect()).rejects.toThrow(
			'MongoDB database name is not configured.'
		)
	})

	it('should return existing client if already connected', async () => {
		await service.connect()
		const db2 = await service.connect()
		expect(logger.info).toHaveBeenCalledWith(
			'MongoDB client already initialized.'
		)
		expect(db2).toBe(mockDb)
	})

	it('should register events and call logger correctly', async () => {
		await service.connect()
		const onCalls = mockOn.mock.calls
		const closeHandler = onCalls.find(c => c[0] === 'close')![1]
		const reconnectHandler = onCalls.find(c => c[0] === 'reconnect')![1]
		const errorHandler = onCalls.find(c => c[0] === 'error')![1]

		const err = new Error('mongo-error')
		closeHandler()
		reconnectHandler()
		errorHandler(err)

		expect(logger.warn).toHaveBeenCalledWith('MongoDB connection closed.')
		expect(logger.info).toHaveBeenCalledWith('MongoDB reconnected.')
		expect(logger.error).toHaveBeenCalledWith('MongoDB error:', err)
	})

	it('should log and throw if connect() fails', async () => {
		mockConnect.mockRejectedValueOnce(new Error('fail'))
		await expect(service.connect()).rejects.toThrow('fail')
		expect(logger.error).toHaveBeenCalledWith(
			'Failed to connect MongoDB:',
			expect.any(Error)
		)
	})

	it('should throw in getClient if not connected', () => {
		expect(() => service.getClient()).toThrow(
			'MongoDB not connected. Call connect() first.'
		)
	})

	it('should disconnect and clean state', async () => {
		await service.connect()
		await service.disconnect()
		expect(mockClose).toHaveBeenCalled()
		expect(logger.info).toHaveBeenCalledWith('MongoDB disconnected.')
	})

	it('should reset internal state for tests', async () => {
		await service.connect()
		service.__resetForTests()
		expect((service as any).client).toBeNull()
		expect((service as any).dbInstance).toBeNull()
	})

	it('should return the connected db instance via getClient', async () => {
		await service.connect()
		const db = service.getClient()
		expect(db).toBe(mockDb)
	})

	it('should do nothing on disconnect if client is not connected', async () => {
		await service.disconnect() // client is null by default
		expect(logger.info).not.toHaveBeenCalledWith(
			expect.stringContaining('disconnected')
		)
	})
})
