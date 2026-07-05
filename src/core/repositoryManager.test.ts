import { vi } from 'vitest'
import {
	createRepositoryManager,
	getRepositoryManager,
	resetRepositoryManager,
	setDependencyContainerForRepositoryManager
} from '../core/repositoryManager'
import { DatabaseClientsMap } from '../infrastructure/databaseManager'

// --- MOCK of repositories ---
vi.mock('@/modules/repositories', () => {
	class FakeRepo {
		static name = 'fake' as any
		static provider = 'postgres'
		public db: any
		public container: any
		constructor(db: any, container: any) {
			this.db = db
			this.container = container
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
vi.mock('@/infrastructure/databaseManager', () => {
	return {
		databaseManager: {
			getAll: vi.fn().mockReturnValue({
				postgres: { client: true }
			})
		}
	}
})

describe('RepositoryManager', () => {
	let mockClients: DatabaseClientsMap

	beforeEach(() => {
		vi.clearAllMocks()
		mockClients = {
			postgres: { mocked: true } as any,
			mongo: {} as any,
			redis: {} as any
		}
	})

	afterEach(() => {
		vi.clearAllMocks()
		resetRepositoryManager()
	})

	it('should load valid repositories with getAll()', () => {
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(mockClients, containerMock)
		const allRepos = manager.getAll() as any
		expect(allRepos.fake).toBeDefined()
		expect((allRepos.fake as any).db).toEqual({ mocked: true })
	})

	it('should return the correct repository with get()', () => {
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(mockClients, containerMock)
		const repo = manager.get('fake' as any)
		expect(repo).toBeDefined()
		expect((repo as any).db).toEqual({ mocked: true })
	})

	it('should throw if repository does not exist when calling get()', () => {
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(
			{
				...mockClients,
				postgres: undefined as any
			},
			containerMock
		)
		expect(() => manager.get('fake' as any)).toThrow(
			'Repository "fake" not loaded'
		)
	})

	it('should return a new instance with create()', () => {
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(mockClients, containerMock)
		const repo1 = manager.get('fake' as any)
		const repo2 = manager.create('fake' as any)
		expect(repo2).toBeInstanceOf((repo1 as any).constructor)
		expect(repo1).not.toBe(repo2)
	})

	it('should throw if repository class does not exist when calling create()', () => {
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(mockClients, containerMock)
		expect(() => manager.create('noexist' as any)).toThrow(
			'Repository class "noexist" not found'
		)
	})

	it('should throw if client does not exist for repository when calling create()', () => {
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(
			{
				...mockClients,
				postgres: undefined as any
			},
			containerMock
		)
		expect(() => manager.create('fake' as any)).toThrow(
			'DB client for repository "fake" not found'
		)
	})

	it('should receive container in constructor and inject into repository', async () => {
		const containerMock = { injected: true } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(mockClients, containerMock)

		const repo = manager.get('fake' as any) as any
		expect(repo.container).toEqual(containerMock)
	})

	it('should skip repository creation if no client exists for its provider', async () => {
		class OrphanRepo {
			static name = 'orphan'
			static provider = 'nonexistent'
			constructor(
				public db: any,
				_container: any
			) {}
		}

		vi.resetModules()
		vi.doMock('@/modules/repositories', () => {
			return {
				repositories: { OrphanRepo },
				RepositoryMap: {
					orphan: {} as InstanceType<typeof OrphanRepo>
				} as any
			}
		})

		const { createRepositoryManager } = await import('@/core/repositoryManager')
		const containerMock = { repositoryManager: {}, logger: {} } as any
		const manager = createRepositoryManager(mockClients, containerMock)

		const all = manager.getAll() as any
		expect(all.orphan).toBeUndefined()
	})

	it('should instantiate only the audit implementation matching config.audit.provider', async () => {
		vi.resetModules()

		class MongoAuditRepo {
			static name = 'audit'
			static provider = 'mongo'
			constructor(
				public db: any,
				_container: any
			) {}
		}

		class PostgresAuditRepo {
			static name = 'audit'
			static provider = 'postgres'
			constructor(
				public db: any,
				_container: any
			) {}
		}

		vi.doMock('@/modules/repositories', () => {
			return {
				repositories: { MongoAuditRepo, PostgresAuditRepo },
				RepositoryMap: {
					audit: {} as InstanceType<typeof MongoAuditRepo>
				} as any
			}
		})

		vi.doMock('@/services/config', () => ({
			config: {
				get: (key: string) =>
					key === 'audit.provider' ? 'postgres' : undefined
			}
		}))

		const {
			createRepositoryManager,
			setDependencyContainerForRepositoryManager
		} = await import('@/core/repositoryManager')
		const containerMock = { repositoryManager: {}, logger: {} } as any
		setDependencyContainerForRepositoryManager(containerMock)
		const manager = createRepositoryManager(
			{
				postgres: { pg: true } as any,
				mongo: { mongo: true } as any,
				redis: { redis: true } as any
			},
			containerMock
		)

		const all = manager.getAll() as any
		expect(all.audit).toBeInstanceOf(PostgresAuditRepo)
		expect(all.audit.db).toEqual({ pg: true })
	})

	describe('getRepositoryManager', () => {
		it('should throw error if dependency container not initialized', () => {
			resetRepositoryManager()
			expect(() => getRepositoryManager()).toThrow(
				'Repository manager cannot be created: dependency container not initialized'
			)
		})

		it('should return singleton instance after initialization', () => {
			resetRepositoryManager()
			const containerMock = { repositoryManager: {}, logger: {} } as any
			setDependencyContainerForRepositoryManager(containerMock)

			const manager1 = getRepositoryManager()
			const manager2 = getRepositoryManager()

			expect(manager1).toBe(manager2)
		})
	})
})
