import {
	createRepositoryManager,
	getRepositoryManager,
	resetRepositoryManager
} from '../core/repositoryManager'
import { DatabaseClientsMap } from '../infrastructure/databaseManager'

// --- MOCK of repositories ---
jest.mock('@/modules/repositories', () => {
	class FakeRepo {
		static name = 'fake' as any
		static provider = 'postgres'
		public db: any
		public context: any
		constructor(db: any) {
			this.db = db
		}
		setContext(container: any) {
			this.context = container
		}
	}
	return {
		repositories: { FakeRepo },
		RepositoryMap: {
			fake: {} as InstanceType<typeof FakeRepo>
		} as any
	}
})

// --- MOCK of databaseManager ---
jest.mock('@/infrastructure/databaseManager', () => {
	return {
		databaseManager: {
			getAll: jest.fn().mockReturnValue({
				postgres: { client: true }
			})
		}
	}
})

describe('RepositoryManager', () => {
	let mockClients: DatabaseClientsMap

	beforeEach(() => {
		jest.clearAllMocks()
		mockClients = {
			postgres: { mocked: true } as any,
			mongo: {} as any,
			redis: {} as any
		}
	})

	afterEach(() => {
		resetRepositoryManager()
	})

	it('should load valid repositories with getAll()', () => {
		const manager = createRepositoryManager(mockClients)
		const allRepos = manager.getAll() as any
		expect(allRepos.fake).toBeDefined()
		expect((allRepos.fake as any).db).toEqual({ mocked: true })
	})

	it('should return the correct repository with get()', () => {
		const manager = createRepositoryManager(mockClients)
		const repo = manager.get('fake' as any)
		expect(repo).toBeDefined()
		expect((repo as any).db).toEqual({ mocked: true })
	})

	it('should throw if repository does not exist when calling get()', () => {
		const manager = createRepositoryManager({
			...mockClients,
			postgres: undefined as any
		})
		expect(() => manager.get('fake' as any)).toThrow(
			'Repository "fake" not loaded'
		)
	})

	it('should return a new instance with create()', () => {
		const manager = createRepositoryManager(mockClients)
		const repo1 = manager.get('fake' as any)
		const repo2 = manager.create('fake' as any)
		expect(repo2).toBeInstanceOf((repo1 as any).constructor)
		expect(repo1).not.toBe(repo2)
	})

	it('should throw if repository class does not exist when calling create()', () => {
		const manager = createRepositoryManager(mockClients)
		expect(() => manager.create('noexist' as any)).toThrow(
			'Repository class "noexist" not found'
		)
	})

	it('should throw if client does not exist for repository when calling create()', () => {
		const manager = createRepositoryManager({
			...mockClients,
			postgres: undefined as any
		})
		expect(() => manager.create('fake' as any)).toThrow(
			'DB client for repository "fake" not found'
		)
	})

	it('should inject context into repositories with setContext()', () => {
		const manager = createRepositoryManager(mockClients)
		const fakeContainer = { injected: true }
		manager.setContext(fakeContainer as any)

		const repo = manager.get('fake' as any) as any
		expect(repo.context).toEqual(fakeContainer)
	})

	it('should skip repository creation if no client exists for its provider', () => {
		class OrphanRepo {
			static name = 'orphan'
			static provider = 'nonexistent'
			constructor(public db: any) {}
		}

		jest.resetModules()
		jest.doMock('@/modules/repositories', () => {
			return {
				repositories: { OrphanRepo },
				RepositoryMap: {
					orphan: {} as InstanceType<typeof OrphanRepo>
				} as any
			}
		})

		const { createRepositoryManager } = require('../core/repositoryManager')
		const manager = createRepositoryManager(mockClients)

		const all = manager.getAll() as any
		expect(all.orphan).toBeUndefined()
	})

	it('should instantiate only the audit implementation matching config.audit.provider', () => {
		jest.resetModules()

		class MongoAuditRepo {
			static name = 'audit'
			static provider = 'mongo'
			constructor(public db: any) {}
		}

		class PostgresAuditRepo {
			static name = 'audit'
			static provider = 'postgres'
			constructor(public db: any) {}
		}

		jest.doMock('@/modules/repositories', () => {
			return {
				repositories: { MongoAuditRepo, PostgresAuditRepo },
				RepositoryMap: {
					audit: {} as InstanceType<typeof MongoAuditRepo>
				} as any
			}
		})

		jest.doMock('@/services/config', () => ({
			config: {
				get: (key: string) =>
					key === 'audit.provider' ? 'postgres' : undefined
			}
		}))

		const { createRepositoryManager } = require('../core/repositoryManager')
		const manager = createRepositoryManager({
			postgres: { pg: true } as any,
			mongo: { mongo: true } as any,
			redis: { redis: true } as any
		})

		const all = manager.getAll() as any
		expect(all.audit).toBeInstanceOf(PostgresAuditRepo)
		expect(all.audit.db).toEqual({ pg: true })
	})

	it('should always return the same instance from getRepositoryManager() (singleton)', () => {
		const m1 = getRepositoryManager()
		const m2 = getRepositoryManager()
		expect(m1).toBe(m2)
	})
})
