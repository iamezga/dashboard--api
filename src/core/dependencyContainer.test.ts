describe('dependencyContainer', () => {
	afterEach(() => {
		jest.resetModules()
		jest.restoreAllMocks()
	})

	function setupBasicMocks() {
		// databaseManager simple stub
		jest.doMock('@/infrastructure/databaseManager', () => ({
			databaseManager: { __mocked: true }
		}))

		// getRepositoryManager -> returns a small mock object with minimal API
		jest.doMock('@/core/repositoryManager', () => ({
			getRepositoryManager: () => ({
				get: jest.fn(),
				create: jest.fn(),
				getAll: jest.fn()
			}),
			setDependencyContainerForRepositoryManager: jest.fn()
		}))

		// AuditService simple class shim (constructor must exist)
		jest.doMock('@/services/auditService', () => ({
			AuditService: class {
				constructor(_arg: any) {}
			}
		}))

		// config, logger, validator, utils, libs
		jest.doMock('@/services/config', () => {
			const mockGet = jest.fn((key: string) => {
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
		jest.doMock('@/services/dayjs', () => ({ dayjs: {}, Dayjs: {} }))
		jest.doMock('@/services/logger', () => {
			const createMockLogger: any = (): any => {
				const mockLogger: any = {
					info: jest.fn(),
					error: jest.fn(),
					warn: jest.fn(),
					child: (..._args: any[]) => createMockLogger()
				}
				return mockLogger
			}
			return createMockLogger()
		})
		jest.doMock('@/services/validationService', () => ({
			validator: {},
			ValidationService: class {}
		}))
		jest.doMock('@/utils', () => ({ utils: {} }))
		jest.doMock('argon2', () => ({}))
		jest.doMock('jsonwebtoken', () => ({}))
		jest.doMock('ms', () => () => '1ms')
	}

	it('should build a container and return the same instance on repeated calls', () => {
		jest.resetModules()
		setupBasicMocks()

		const { getContainer } = require('@/core/dependencyContainer') as {
			getContainer: () => any
		}

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

	it('should forward the actual container to the callback in getCustomContainer', () => {
		jest.resetModules()
		setupBasicMocks()

		const { getContainer, getCustomContainer } =
			require('@/core/dependencyContainer') as {
				getContainer: () => any
				getCustomContainer: <T>(cb: (c: any) => T) => T
			}

		const container = getContainer()
		const picked = getCustomContainer(c => ({
			repoManager: c.repositoryManager,
			pm: c.databaseManager
		}))

		// ensure the callback received the same container object (we compare the repoManager ref)
		expect(picked.repoManager).toBe(container.repositoryManager)
		expect(picked.pm).toBe(container.databaseManager)
	})

	it('should reset the singleton with resetContainer so getContainer creates a new instance', () => {
		jest.resetModules()
		setupBasicMocks()

		const mod = require('@/core/dependencyContainer') as {
			getContainer: () => any
			resetContainer: () => void
		}

		const c1 = mod.getContainer()
		mod.resetContainer()
		const c2 = mod.getContainer()

		expect(c1).not.toBe(c2)
	})

	it('should build email service with nodemailer provider when configured', () => {
		jest.resetModules()

		// Setup all basic mocks
		jest.doMock('@/infrastructure/databaseManager', () => ({
			databaseManager: { __mocked: true }
		}))
		jest.doMock('@/core/repositoryManager', () => ({
			getRepositoryManager: () => ({
				get: jest.fn(),
				create: jest.fn(),
				getAll: jest.fn()
			}),
			setDependencyContainerForRepositoryManager: jest.fn()
		}))
		jest.doMock('@/services/auditService', () => ({
			AuditService: class {
				constructor(_arg: any) {}
			}
		}))

		// Config with nodemailer provider (instead of 'log')
		jest.doMock('@/services/config', () => ({
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

		jest.doMock('@/services/dayjs', () => ({ dayjs: {} }))
		jest.doMock('@/services/logger', () => {
			const createMockLogger: any = (): any => {
				const mockLogger: any = {
					info: jest.fn(),
					error: jest.fn(),
					warn: jest.fn(),
					child: (..._args: any[]) => createMockLogger()
				}
				return mockLogger
			}
			return createMockLogger()
		})
		jest.doMock('@/services/validationService', () => ({
			validator: {},
			ValidationService: class {}
		}))
		jest.doMock('@/utils', () => ({ utils: {} }))
		jest.doMock('argon2', () => ({}))
		jest.doMock('jsonwebtoken', () => ({}))
		jest.doMock('ms', () => () => '1ms')

		// Mock email services
		jest.doMock('@/services/email/EmailService', () => ({
			EmailService: class {
				constructor(_provider: any, _logger: any, _registry: any) {}
			}
		}))
		jest.doMock('@/services/email/providers/LogEmailProvider', () => ({
			LogEmailProvider: class {
				constructor(_logger: any) {}
			}
		}))
		jest.doMock('@/services/email/providers/NodemailerProvider', () => ({
			NodemailerProvider: class {
				constructor(_config: any, _logger: any) {}
			}
		}))
		jest.doMock('@/services/email/EmailTemplateRegistry', () => ({
			InMemoryEmailTemplateRegistry: class {
				register() {}
			}
		}))
		jest.doMock('@/services/email/templates', () => ({
			defaultEmailTemplates: []
		}))
		jest.doMock('@/services/jobService', () => ({
			JobService: class {
				constructor(_queueManager: any) {}
			}
		}))
		jest.doMock('@/infrastructure/queueManager', () => ({
			queueManager: { getQueue: jest.fn() }
		}))

		const { getContainer } = require('@/core/dependencyContainer') as {
			getContainer: () => any
		}

		const container = getContainer()

		// Should create container successfully with nodemailer provider
		expect(container).toBeDefined()
		expect(container.services).toBeDefined()
		expect(container.services.emailService).toBeDefined()
	})
})
