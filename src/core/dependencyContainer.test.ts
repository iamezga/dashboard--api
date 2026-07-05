import { vi } from 'vitest'

describe('dependencyContainer', () => {
	afterEach(() => {
		vi.resetModules()
		vi.restoreAllMocks()
	})

	function setupBasicMocks() {
		const createMockLogger = (): any => ({
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			child: (..._args: any[]) => createMockLogger()
		})

		// databaseManager simple stub
		vi.doMock('@/infrastructure/databaseManager', () => ({
			databaseManager: { __mocked: true }
		}))

		// getRepositoryManager -> returns a small mock object with minimal API
		vi.doMock('@/core/repositoryManager', () => ({
			getRepositoryManager: () => ({
				get: vi.fn(),
				create: vi.fn(),
				getAll: vi.fn()
			}),
			setDependencyContainerForRepositoryManager: vi.fn()
		}))

		// AuditService simple class shim (constructor must exist)
		vi.doMock('@/services/auditService', () => ({
			AuditService: class {
				constructor(_arg: any) {}
			}
		}))

		// config, logger, validator, utils, libs
		vi.doMock('@/services/config', () => {
			const mockGet = vi.fn((key: string) => {
				switch (key) {
					case 'env':
						return 'test'
					case 'appName':
						return 'test-app'
					case 'email':
						return {
							provider: 'log',
							nodemailer: {
								host: '',
								port: 587,
								secure: false,
								auth: { user: '', pass: '' },
								from: 'noreply@example.com'
							}
						}
					default:
						return undefined
				}
			})
			return {
				config: { get: mockGet },
				Config: {}
			}
		})
		vi.doMock('@/services/dayjs', () => ({ dayjs: {}, Dayjs: {} }))
		vi.doMock('@/services/logger', () => ({
			__esModule: true,
			default: createMockLogger()
		}))
		vi.doMock('@/services/validationService', () => ({
			validator: {},
			ValidationService: class {}
		}))
		vi.doMock('@/utils', () => ({ utils: {} }))
		vi.doMock('argon2', () => ({}))
		vi.doMock('jsonwebtoken', () => ({
			__esModule: true,
			default: {}
		}))
		vi.doMock('ms', () => ({
			__esModule: true,
			default: () => '1ms'
		}))
	}

	async function loadDependencyContainerModule() {
		return import('@/core/dependencyContainer')
	}

	it('should build a container and return the same instance on repeated calls', async () => {
		vi.resetModules()
		setupBasicMocks()

		const { getContainer } = await loadDependencyContainerModule()

		const c1 = getContainer()
		const c2 = getContainer()

		// identity: same object (singleton)
		expect(c1).toBe(c2)

		// shape: has the expected runtime properties
		expect(c1).toHaveProperty('repositoryManager')
		expect(c1).toHaveProperty('databaseManager')
		expect(c1).toHaveProperty('services')
		expect(c1).toHaveProperty('libs')
		expect(typeof c1.config?.get).toBe('function')
	})

	it('should forward the actual container to the callback in getCustomContainer', async () => {
		vi.resetModules()
		setupBasicMocks()

		const { getContainer, getCustomContainer } =
			await loadDependencyContainerModule()

		const container = getContainer()
		const picked = getCustomContainer(c => ({
			repositoryManager: c.repositoryManager,
			databaseManager: c.databaseManager
		}))

		// ensure the callback received the same container object (we compare the repoManager ref)
		expect(picked.repositoryManager).toBe(container.repositoryManager)
		expect(picked.databaseManager).toBe(container.databaseManager)
	})

	it('should reset the singleton with resetContainer so getContainer creates a new instance', async () => {
		vi.resetModules()
		setupBasicMocks()

		const mod = await loadDependencyContainerModule()

		const c1 = mod.getContainer()
		mod.resetContainer()
		const c2 = mod.getContainer()

		expect(c1).not.toBe(c2)
	})

	it('should build email service with nodemailer provider when configured', async () => {
		vi.resetModules()

		// Setup all basic mocks
		vi.doMock('@/infrastructure/databaseManager', () => ({
			databaseManager: { __mocked: true }
		}))
		vi.doMock('@/core/repositoryManager', () => ({
			getRepositoryManager: () => ({
				get: vi.fn(),
				create: vi.fn(),
				getAll: vi.fn()
			}),
			setDependencyContainerForRepositoryManager: vi.fn()
		}))
		vi.doMock('@/services/auditService', () => ({
			AuditService: class {
				constructor(_arg: any) {}
			}
		}))

		// Config with nodemailer provider (instead of 'log')
		vi.doMock('@/services/config', () => ({
			config: {
				get: (key: string) => {
					if (key === 'email') {
						return {
							provider: 'nodemailer',
							nodemailer: {
								host: 'smtp.example.com',
								port: 587,
								secure: false,
								auth: { user: 'test@example.com', pass: 'password' },
								from: 'noreply@example.com'
							}
						}
					}
					return undefined
				}
			}
		}))

		vi.doMock('@/services/dayjs', () => ({ dayjs: {} }))
		vi.doMock('@/services/logger', () => {
			const createMockLogger = (): any => ({
				info: vi.fn(),
				error: vi.fn(),
				warn: vi.fn(),
				child: (..._args: any[]) => createMockLogger()
			})

			return {
				__esModule: true,
				default: createMockLogger()
			}
		})
		vi.doMock('@/services/validationService', () => ({
			validator: {},
			ValidationService: class {}
		}))
		vi.doMock('@/utils', () => ({ utils: {} }))
		vi.doMock('argon2', () => ({}))
		vi.doMock('jsonwebtoken', () => ({
			__esModule: true,
			default: {}
		}))
		vi.doMock('ms', () => ({
			__esModule: true,
			default: () => '1ms'
		}))

		// Mock email services
		vi.doMock('@/services/email/EmailService', () => ({
			EmailService: class {
				constructor(_provider: any, _logger: any, _registry: any) {}
			}
		}))
		vi.doMock('@/services/email/providers/LogEmailProvider', () => ({
			LogEmailProvider: class {
				constructor(_logger: any) {}
			}
		}))
		vi.doMock('@/services/email/providers/NodemailerProvider', () => ({
			NodemailerProvider: class {
				constructor(_config: any, _logger: any) {}
			}
		}))
		vi.doMock('@/services/email/EmailTemplateRegistry', () => ({
			InMemoryEmailTemplateRegistry: class {
				register() {}
			}
		}))
		vi.doMock('@/services/email/templates', () => ({
			defaultEmailTemplates: []
		}))
		vi.doMock('@/services/jobService', () => ({
			JobService: class {
				constructor(_queueManager: any) {}
			}
		}))
		vi.doMock('@/infrastructure/queueManager', () => ({
			queueManager: { getQueue: vi.fn() }
		}))

		const { getContainer } = await loadDependencyContainerModule()

		const container = getContainer()

		// Should create container successfully with nodemailer provider
		expect(container).toBeDefined()
		expect(container.services).toBeDefined()
		expect(container.services.emailService).toBeDefined()
	})
})
