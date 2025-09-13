import { DatabaseClients } from './databaseServiceManager'
import { detectDBType, normalizeRepoName } from './repositoryLoader'

const mockClients: DatabaseClients = {
	postgres: {},
	mongo: {}
} as DatabaseClients

describe('loadRepositories', () => {
	let loadRepositoriesFunction: (clients: DatabaseClients) => any
	let mockPostgresUserRepository: jest.Mock
	let mockMongoAuditRepository: jest.Mock

	beforeEach(() => {
		jest.resetModules()
		jest.clearAllMocks()

		mockPostgresUserRepository = jest.fn()
		mockMongoAuditRepository = jest.fn()

		jest.mock('@/modules/repositories', () => ({
			repositories: {
				PostgresUserRepository: mockPostgresUserRepository,
				MongoAuditRepository: mockMongoAuditRepository
			}
		}))

		const { loadRepositories } = require('./repositoryLoader')
		loadRepositoriesFunction = loadRepositories
	})

	it('should instantiate repositories when their clients are available', () => {
		const repos = loadRepositoriesFunction(mockClients)

		expect(mockPostgresUserRepository).toHaveBeenCalledWith(
			mockClients.postgres
		)
		expect(mockMongoAuditRepository).toHaveBeenCalledWith(mockClients.mongo)
		expect(repos).toHaveProperty('user')
		expect(repos).toHaveProperty('audit')
	})

	it('should not instantiate a repository if its database client is not provided', () => {
		const clientsWithoutMongo = {
			postgres: mockClients.postgres
		} as DatabaseClients

		loadRepositoriesFunction(clientsWithoutMongo)

		expect(mockPostgresUserRepository).toHaveBeenCalledTimes(1)
		expect(mockMongoAuditRepository).not.toHaveBeenCalled()
	})

	it('should return an empty map if no repositories are provided', () => {
		jest.resetModules()
		jest.mock('@/modules/repositories', () => ({ repositories: {} }))
		const { loadRepositories: loadReposMock } = require('./repositoryLoader')

		const repos = loadReposMock(mockClients)
		expect(Object.keys(repos)).toHaveLength(0)
	})
})

describe('normalizeRepoName', () => {
	it('should correctly normalize a repo name with a valid prefix', () => {
		expect(normalizeRepoName('PostgresUserRepository')).toBe('user')
		expect(normalizeRepoName('MongoAuditRepository')).toBe('audit')
	})

	it('should throw an error for a repo name with an invalid prefix', () => {
		expect(() => normalizeRepoName('UnsupportedRepo')).toThrow(
			'DB prefix not supported in UnsupportedRepo'
		)
	})
})

describe('detectDBType', () => {
	it('should correctly detect the DB type from a repo name', () => {
		expect(detectDBType('PostgresUserRepository')).toBe('postgres')
		expect(detectDBType('MongoAuditRepository')).toBe('mongo')
	})

	it('should throw an error for a repo name with an invalid prefix', () => {
		expect(() => detectDBType('UnsupportedRepo')).toThrow(
			'DB could not be detected in UnsupportedRepo'
		)
	})
})
