import { BadRequestError, UnauthorizedError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthLoginJobInterface } from './AuthLoginJobInterface'
import { AuthLoginUseCase } from './AuthLoginUseCase'

describe('AuthLoginUseCase', () => {
	const userRepo = {
		findUserAuthDetailsByEmail: jest.fn(),
		update: jest.fn()
	}

	const roleRepo = {
		findByIdWithPermissions: jest.fn()
	}

	const sessionRepo = {
		hasActiveSessions: jest.fn(),
		saveUserData: jest.fn(),
		createSession: jest.fn()
	}

	const organizationRepo = {
		findBySlug: jest.fn()
	}

	const argon2 = {
		verify: jest.fn()
	}

	const validator = {
		validate: jest.fn()
	}

	const auditService = {
		record: jest.fn()
	}

	const utils = {
		deepMerge: jest.fn((a, b) => ({ ...a, ...b })),
		getTimeInSeconds: jest.fn(() => 3600)
	}

	const logger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}

	let config = {
		get: jest.fn((key: string) => {
			if (key === 'jwt.secret') return 'super-secret'
			if (key === 'jwt.expiresIn') return '1h'
			return null
		})
	}

	const libs = {
		argon2,
		jwt: { sign: jest.fn(() => 'token123') },
		dayjs: jest.fn((date?: Date) => ({
			tz: jest.fn((_timezone: string) => ({
				format: jest.fn((pattern: string) => {
					if (pattern === 'dddd') return 'Monday'
					if (pattern === 'HH:mm') {
						const d = date || new Date()
						return `${d.getHours().toString().padStart(2, '0')}:${d
							.getMinutes()
							.toString()
							.padStart(2, '0')}`
					}
					return 'mocked-format'
				})
			})),
			format: jest.fn((pattern: string) => {
				if (pattern === 'dddd') return 'Monday'
				if (pattern === 'HH:mm') {
					const d = date || new Date()
					return `${d.getHours().toString().padStart(2, '0')}:${d
						.getMinutes()
						.toString()
						.padStart(2, '0')}`
				}
				return 'mocked-format'
			})
		}))
	}

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return userRepo
					if (name === 'role') return roleRepo
					if (name === 'session') return sessionRepo
					if (name === 'organization') return organizationRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			libs,
			services: { auditService },
			config,
			validator,
			utils,
			logger
		}) as unknown as DependencyContainer

	const makeJob = (data: any, permissions = {}): AuthLoginJobInterface =>
		({
			getData: () => data,
			getMeta: () => ({ timestamp: new Date(), userAgent: 'agent' }),
			getUser: () => ({ permissions }),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		}) as any

	beforeEach(() => {
		jest.clearAllMocks()

		// Mock organization repository to return valid organization by default
		organizationRepo.findBySlug.mockResolvedValue({
			id: 'org-123',
			slug: 'test-org',
			name: 'Test Organization',
			timezone: 'UTC'
		})

		config = {
			get: jest.fn((key: string) => {
				if (key === 'jwt.secret') return 'super-secret'
				if (key === 'jwt.expiresIn') return '1h'
				return null
			})
		}
	})

	it('should throw BadRequestError for invalid organization slug', async () => {
		organizationRepo.findBySlug.mockResolvedValueOnce(null)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'invalid-org'
				})
			)
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should throw BadRequestError for non-existent user', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(null)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'nouser@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should throw BadRequestError for inactive or deleted user', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u1',
			email: 'user@mail.com',
			active: false,
			deletedAt: null
		})
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(BadRequestError)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u2',
			email: 'user@mail.com',
			active: true,
			deletedAt: new Date()
		})
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should throw BadRequestError for invalid password', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			userPermissions: []
		})
		argon2.verify.mockResolvedValueOnce(false)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: 'wrong',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(BadRequestError)
	})

	it('should throw UnauthorizedError if no roleId', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			userPermissions: [],
			roleId: null
		})
		argon2.verify.mockResolvedValueOnce(true)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw UnauthorizedError if role inactive', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			userPermissions: []
		})
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: false,
			rolePermissions: []
		})
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw UnauthorizedError if permission validation fails', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: []
		})
		validator.validate.mockResolvedValueOnce([
			{ field: 'timezone', message: 'Invalid timezone' }
		])
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw UnauthorizedError if multiple sessions not allowed', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: { allowMultipleSessions: false }
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(true)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw Error if update user fails', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: { allowMultipleSessions: true }
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(null) // Fail update
		sessionRepo.createSession.mockResolvedValueOnce('sess123')
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toThrow(/Failed to update last login/)
	})

	it('should throw Error if createSession fails', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		const mockUserRepo = {
			findUserAuthDetailsByEmail: jest.fn().mockResolvedValue(userData),
			update: jest.fn().mockResolvedValue(userData)
		}

		const mockRoleRepo = {
			findByIdWithPermissions: jest.fn().mockResolvedValue({
				id: 'r1',
				active: true,
				rolePermissions: [
					{
						permission: { key: 'auth.login', active: true, deletedAt: null },
						config: { allowMultipleSessions: true }
					}
				]
			})
		}

		const mockSessionRepo = {
			hasActiveSessions: jest.fn().mockResolvedValue(false),
			saveUserData: jest.fn().mockResolvedValue(undefined),
			createSession: jest.fn().mockResolvedValue(null)
		}

		const container = {
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return mockUserRepo
					if (name === 'role') return mockRoleRepo
					if (name === 'session') return mockSessionRepo
					if (name === 'organization') return organizationRepo
				}
			},
			libs,
			config,
			utils,
			validator: { validate: jest.fn().mockResolvedValue([]) },
			services: { auditService },
			logger
		} as unknown as DependencyContainer

		argon2.verify.mockResolvedValue(true)

		const useCase = new AuthLoginUseCase(container)

		await expect(
			useCase.run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)
		).rejects.toThrow(/Could not create user session/)
	})

	it('should login successfully', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		const mockUserRepo = {
			findUserAuthDetailsByEmail: jest.fn().mockResolvedValue(userData),
			update: jest.fn().mockResolvedValue(userData)
		}

		const mockRoleRepo = {
			findByIdWithPermissions: jest.fn().mockResolvedValue({
				id: 'r1',
				active: true,
				rolePermissions: [
					{
						permission: { key: 'auth.login', active: true, deletedAt: null },
						config: { allowMultipleSessions: true }
					}
				]
			})
		}
		const mockSessionRepo = {
			hasActiveSessions: jest.fn().mockResolvedValue(false),
			saveUserData: jest.fn().mockResolvedValue(undefined),
			createSession: jest.fn().mockResolvedValue('sess123')
		}

		const container = {
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return mockUserRepo
					if (name === 'role') return mockRoleRepo
					if (name === 'session') return mockSessionRepo
					if (name === 'organization') return organizationRepo
				}
			},
			libs,
			config,
			utils,
			validator: { validate: jest.fn().mockResolvedValue([]) },
			services: { auditService },
			logger
		} as unknown as DependencyContainer

		argon2.verify.mockResolvedValueOnce(true)

		const useCase = new AuthLoginUseCase(container)
		const result = await useCase.run(
			makeJob({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			})
		)

		expect(result.data.token).toBe('token123')
		expect(result.data.user.id).toBe('u1')
		expect(mockSessionRepo.createSession).toHaveBeenCalled()
	})

	it('should filter out deleted and inactive permissions', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: [
				{
					permission: {
						id: 'p1',
						key: 'user.create',
						active: true,
						deletedAt: null
					},
					config: {},
					disabled: false,
					deletedAt: null
				},
				{
					permission: {
						id: 'p2',
						key: 'user.delete',
						active: false, // Inactive
						deletedAt: null
					},
					config: {},
					disabled: false,
					deletedAt: null
				},
				{
					permission: {
						id: 'p3',
						key: 'user.update',
						active: true,
						deletedAt: new Date() // Deleted permission
					},
					config: {},
					disabled: false,
					deletedAt: null
				},
				{
					permission: {
						id: 'p4',
						key: 'user.read',
						active: true,
						deletedAt: null
					},
					config: {},
					disabled: true, // Disabled user permission
					deletedAt: null
				}
			]
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: { allowMultipleSessions: true }
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJob({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			})
		)

		expect(result.data.token).toBe('token123')
		expect(result.data.user.id).toBe('u1')
	})

	it('should merge role and user permissions correctly', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: { allowMultipleSessions: true }
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const deepMergeSpy = jest.spyOn(makeContainer().utils, 'deepMerge')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJob({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			})
		)

		expect(deepMergeSpy).toHaveBeenCalled()
		expect(result.data.token).toBe('token123')
	})

	it('should call audit service after successful login', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org1',
			userPermissions: []
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: []
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJob({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			})
		)

		expect(auditService.record).toHaveBeenCalledWith(
			'auth.login',
			expect.anything(),
			'user',
			'u1',
			expect.objectContaining({ userAgent: 'agent' })
		)
		expect(result.data.token).toBe('token123')
	})

	it('should use organizationId from resolved organization', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: []
		}

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: []
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJob({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			})
		)

		expect(userRepo.findUserAuthDetailsByEmail).toHaveBeenCalledWith(
			'user@mail.com'
		)
		expect(result.data.token).toBe('token123')
	})

	it('should throw UnauthorizedError when timezone header missing and timezones condition enabled', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: []
		}

		const makeJobWithoutTimezone = (data: any) => ({
			getData: () => data,
			getMeta: () => ({ timestamp: new Date(), userAgent: 'agent' }), // No timezone
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								timezones: {
									enabled: true,
									values: ['America/New_York', 'Europe/London']
								}
							}
						}
					}
				}
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							timezones: {
								enabled: true,
								values: ['America/New_York', 'Europe/London']
							}
						}
					}
				}
			]
		})

		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(
				makeJobWithoutTimezone({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				}) as any
			)
		).rejects.toThrow(UnauthorizedError)
	})

	it('should throw detailed error message in development when timezone header is missing', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: []
		}

		const makeJobWithoutTimezone = (data: any) => ({
			getData: () => data,
			getMeta: () => ({ timestamp: new Date(), userAgent: 'agent' }), // No timezone
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								timezones: {
									enabled: true,
									values: ['America/New_York', 'Europe/London']
								}
							}
						}
					}
				}
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							timezones: {
								enabled: true,
								values: ['America/New_York', 'Europe/London']
							}
						}
					}
				}
			]
		})

		const devConfig = {
			get: jest.fn((key: string) => {
				if (key === 'jwt.secret') return 'super-secret'
				if (key === 'jwt.expiresIn') return '1h'
				if (key === 'env') return 'development'
				return null
			})
		}

		const devContainer = {
			...makeContainer(),
			config: devConfig
		}

		const useCase = new AuthLoginUseCase(
			devContainer as unknown as DependencyContainer
		)
		await expect(
			useCase.run(
				makeJobWithoutTimezone({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				}) as any
			)
		).rejects.toThrow(
			'Authentication failed: X-Timezone header is required for geographic access control.'
		)
	})

	it('should throw generic error message in production when timezone header is missing', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: []
		}

		const makeJobWithoutTimezone = (data: any) => ({
			getData: () => data,
			getMeta: () => ({ timestamp: new Date(), userAgent: 'agent' }), // No timezone
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								timezones: {
									enabled: true,
									values: ['America/New_York', 'Europe/London']
								}
							}
						}
					}
				}
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							timezones: {
								enabled: true,
								values: ['America/New_York', 'Europe/London']
							}
						}
					}
				}
			]
		})

		const prodConfig = {
			get: jest.fn((key: string) => {
				if (key === 'jwt.secret') return 'super-secret'
				if (key === 'jwt.expiresIn') return '1h'
				if (key === 'env') return 'production'
				return null
			})
		}

		const prodContainer = {
			...makeContainer(),
			config: prodConfig
		}

		const useCase = new AuthLoginUseCase(
			prodContainer as unknown as DependencyContainer
		)
		await expect(
			useCase.run(
				makeJobWithoutTimezone({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				}) as any
			)
		).rejects.toThrow('Authentication failed: Insufficient permissions.')
	})

	it('should validate timezone when timezones condition enabled', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: [],
			organization: { timezone: 'UTC' }
		}

		const makeJobWithTimezone = (data: any) => ({
			getData: () => data,
			getMeta: () => ({
				timestamp: new Date(),
				userAgent: 'agent',
				timezone: 'America/New_York'
			}),
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								timezones: {
									enabled: true,
									values: ['America/New_York', 'Europe/London']
								}
							},
							allowMultipleSessions: true
						}
					}
				},
				organization: { timezone: 'UTC' }
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							timezones: {
								enabled: true,
								values: ['America/New_York', 'Europe/London']
							}
						},
						allowMultipleSessions: true
					}
				}
			]
		})
		validator.validate.mockResolvedValueOnce([]) // Timezone is valid
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJobWithTimezone({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			}) as any
		)

		expect(result.data.token).toBe('token123')
		expect(validator.validate).toHaveBeenCalledWith(
			expect.objectContaining({ timezone: 'America/New_York' }),
			expect.objectContaining({
				timezone: {
					type: 'enum',
					values: ['America/New_York', 'Europe/London']
				}
			})
		)
	})

	it('should validate accessDays when accessDays condition enabled', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: [],
			organization: { timezone: 'UTC' }
		}

		const makeJobWithAccessDays = (data: any) => ({
			getData: () => data,
			getMeta: () => ({
				timestamp: new Date('2025-09-22T12:00:00'), // Monday
				userAgent: 'agent'
			}),
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								accessDays: {
									enabled: true,
									values: ['Monday', 'Tuesday', 'Wednesday']
								}
							},
							allowMultipleSessions: true
						}
					}
				},
				organization: { timezone: 'UTC' }
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							accessDays: {
								enabled: true,
								values: ['Monday', 'Tuesday', 'Wednesday']
							}
						},
						allowMultipleSessions: true
					}
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJobWithAccessDays({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			}) as any
		)

		expect(result.data.token).toBe('token123')
		expect(validator.validate).toHaveBeenCalledWith(
			expect.objectContaining({ accessDay: 'Monday' }),
			expect.objectContaining({
				accessDay: {
					type: 'enum',
					values: ['Monday', 'Tuesday', 'Wednesday']
				}
			})
		)
	})

	it('should validate accessTime when accessTime condition enabled', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: [],
			organization: { timezone: 'America/New_York' }
		}

		const makeJobWithAccessTime = (data: any) => ({
			getData: () => data,
			getMeta: () => ({
				timestamp: new Date('2025-09-22T14:30:00'),
				userAgent: 'agent'
			}),
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								accessTime: {
									enabled: true,
									options: {
										from: '09:00',
										to: '18:00'
									}
								}
							},
							allowMultipleSessions: true
						}
					}
				},
				organization: { timezone: 'America/New_York' }
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							accessTime: {
								enabled: true,
								options: {
									from: '09:00',
									to: '18:00'
								}
							}
						},
						allowMultipleSessions: true
					}
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJobWithAccessTime({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			}) as any
		)

		expect(result.data.token).toBe('token123')
		expect(validator.validate).toHaveBeenCalledWith(
			expect.objectContaining({ accessTime: expect.any(String) }),
			expect.objectContaining({
				accessTime: {
					type: 'multiAll',
					rules: [
						{
							type: 'compare',
							comparison: 'gte',
							value: '09:00'
						},
						{
							type: 'compare',
							comparison: 'lte',
							value: '18:00'
						}
					]
				}
			})
		)
	})

	it('should combine all conditions when multiple are enabled', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: [],
			organization: { timezone: 'UTC' }
		}

		const makeJobWithAllConditions = (data: any) => ({
			getData: () => data,
			getMeta: () => ({
				timestamp: new Date('2025-09-22T14:30:00'), // Monday
				userAgent: 'agent',
				timezone: 'America/New_York'
			}),
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							conditions: {
								timezones: {
									enabled: true,
									values: ['America/New_York', 'Europe/London']
								},
								accessDays: {
									enabled: true,
									values: ['Monday', 'Tuesday', 'Wednesday']
								},
								accessTime: {
									enabled: true,
									options: {
										from: '09:00',
										to: '18:00'
									}
								}
							},
							allowMultipleSessions: true
						}
					}
				},
				organization: { timezone: 'UTC' }
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						conditions: {
							timezones: {
								enabled: true,
								values: ['America/New_York', 'Europe/London']
							},
							accessDays: {
								enabled: true,
								values: ['Monday', 'Tuesday', 'Wednesday']
							},
							accessTime: {
								enabled: true,
								options: {
									from: '09:00',
									to: '18:00'
								}
							}
						},
						allowMultipleSessions: true
					}
				}
			]
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJobWithAllConditions({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			}) as any
		)

		expect(result.data.token).toBe('token123')
		expect(validator.validate).toHaveBeenCalledWith(
			expect.objectContaining({
				timezone: 'America/New_York',
				accessDay: 'Monday',
				accessTime: expect.any(String)
			}),
			expect.objectContaining({
				timezone: expect.any(Object),
				accessDay: expect.any(Object),
				accessTime: expect.any(Object)
			})
		)
	})

	it('should skip permission conditions validation when conditions are not configured', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
			name: 'John',
			surname: 'Doe',
			organizationId: 'org-123',
			userPermissions: [],
			organization: { timezone: 'UTC' }
		}

		const makeJobNoConditions = (data: any) => ({
			getData: () => data,
			getMeta: () => ({
				timestamp: new Date(),
				userAgent: 'agent'
			}),
			getUser: () => ({
				permissions: {
					'auth.login': {
						key: 'auth.login',
						config: {
							allowMultipleSessions: true
							// No conditions configured
						}
					}
				},
				organization: { timezone: 'UTC' }
			}),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, deletedAt: null },
					config: {
						allowMultipleSessions: true
						// No conditions
					}
				}
			]
		})
		userRepo.update.mockResolvedValueOnce(userData)
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJobNoConditions({
				email: 'user@mail.com',
				password: '123',
				organization: 'test-org'
			}) as any
		)

		expect(result.data.token).toBe('token123')
		// Validator should not be called for timezone, accessDay, or accessTime
		expect(validator.validate).not.toHaveBeenCalledWith(
			expect.objectContaining({ timezone: expect.anything() }),
			expect.anything()
		)
	})

	describe('Permission filtering', () => {
		it('should filter out inactive and deleted permissions from role', async () => {
			const userData = {
				id: 'u1',
				email: 'user@mail.com',
				passwordHash: 'hash',
				active: true,
				deletedAt: null,
				roleId: 'r1',
				name: 'John',
				surname: 'Doe',
				organizationId: 'org-123',
				userPermissions: []
			}

			userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
			argon2.verify.mockResolvedValueOnce(true)
			roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
				id: 'r1',
				active: true,
				rolePermissions: [
					{
						permission: {
							key: 'auth.login',
							active: true,
							deletedAt: null
						},
						config: { allowMultipleSessions: true }
					},
					{
						permission: {
							key: 'user.create',
							active: false, // Inactive permission
							deletedAt: null
						},
						config: {}
					},
					{
						permission: {
							key: 'user.delete',
							active: true,
							deletedAt: new Date() // Deleted permission
						},
						config: {}
					},
					{
						permission: {
							key: 'user.read',
							active: true,
							deletedAt: null
						},
						config: {}
					}
				]
			})
			userRepo.update.mockResolvedValueOnce(userData)
			validator.validate.mockResolvedValueOnce([])
			sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
			sessionRepo.createSession.mockResolvedValueOnce('sess123')

			const result = await new AuthLoginUseCase(makeContainer()).run(
				makeJob({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				})
			)

			expect(result.data.token).toBe('token123')
			// Verify that saveUserData was called with only active, non-deleted permissions
			expect(sessionRepo.saveUserData).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({
					permissions: expect.objectContaining({
						'auth.login': expect.any(Object),
						'user.read': expect.any(Object)
						// user.create and user.delete should NOT be present
					})
				}),
				expect.any(Number)
			)
			const savedPermissions = (sessionRepo.saveUserData as jest.Mock).mock
				.calls[0][1].permissions
			expect(savedPermissions).not.toHaveProperty('user.create')
			expect(savedPermissions).not.toHaveProperty('user.delete')
		})
	})

	describe('JWT token generation', () => {
		it('should use default JWT expiresIn from config when maxSessionTime is not configured', async () => {
			const userData = {
				id: 'u1',
				email: 'user@mail.com',
				passwordHash: 'hash',
				active: true,
				deletedAt: null,
				roleId: 'r1',
				name: 'John',
				surname: 'Doe',
				organizationId: 'org-123',
				userPermissions: []
			}

			const makeJobNoMaxSessionTime = (data: any) => ({
				getData: () => data,
				getMeta: () => ({
					timestamp: new Date(),
					userAgent: 'agent'
				}),
				getUser: () => ({
					permissions: {
						'auth.login': {
							key: 'auth.login',
							config: {
								allowMultipleSessions: true
								// No maxSessionTime configured
							}
						}
					}
				}),
				setUser: jest.fn(),
				getAttempts: () => 1,
				logger
			})

			userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
			argon2.verify.mockResolvedValueOnce(true)
			roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
				id: 'r1',
				active: true,
				rolePermissions: [
					{
						permission: { key: 'auth.login', active: true, deletedAt: null },
						config: {
							allowMultipleSessions: true
							// No maxSessionTime
						}
					}
				]
			})
			userRepo.update.mockResolvedValueOnce(userData)
			validator.validate.mockResolvedValueOnce([])
			sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
			sessionRepo.createSession.mockResolvedValueOnce('sess123')
			const jwtSign = jest.fn().mockReturnValue('token123')
			const containerWithJwt = makeContainer()
			containerWithJwt.libs.jwt.sign = jwtSign

			const result = await new AuthLoginUseCase(containerWithJwt).run(
				makeJobNoMaxSessionTime({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				}) as any
			)

			expect(result.data.token).toBe('token123')
			// Verify jwt.sign was called with default expiresIn from config
			expect(jwtSign).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(String),
				expect.objectContaining({
					expiresIn: '1h' // Default from makeContainer config
				})
			)
		})

		it('should use maxSessionTime from permission config when configured', async () => {
			const userData = {
				id: 'u1',
				email: 'user@mail.com',
				passwordHash: 'hash',
				active: true,
				deletedAt: null,
				roleId: 'r1',
				name: 'John',
				surname: 'Doe',
				organizationId: 'org-123',
				userPermissions: []
			}

			const makeJobWithMaxSessionTime = (data: any) => ({
				getData: () => data,
				getMeta: () => ({
					timestamp: new Date(),
					userAgent: 'agent'
				}),
				getUser: () => ({
					permissions: {
						'auth.login': {
							key: 'auth.login',
							config: {
								allowMultipleSessions: true,
								maxSessionTime: 7200 // 2 hours in seconds
							}
						}
					}
				}),
				setUser: jest.fn(),
				getAttempts: () => 1,
				logger
			})

			userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
			argon2.verify.mockResolvedValueOnce(true)
			roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
				id: 'r1',
				active: true,
				rolePermissions: [
					{
						permission: { key: 'auth.login', active: true, deletedAt: null },
						config: {
							allowMultipleSessions: true,
							maxSessionTime: 7200
						}
					}
				]
			})
			userRepo.update.mockResolvedValueOnce(userData)
			validator.validate.mockResolvedValueOnce([])
			sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
			sessionRepo.createSession.mockResolvedValueOnce('sess123')
			const jwtSign = jest.fn().mockReturnValue('token123')
			const containerWithJwt = makeContainer()
			containerWithJwt.libs.jwt.sign = jwtSign

			const result = await new AuthLoginUseCase(containerWithJwt).run(
				makeJobWithMaxSessionTime({
					email: 'user@mail.com',
					password: '123',
					organization: 'test-org'
				}) as any
			)
			expect(result.data.token).toBe('token123')
			// Verify jwt.sign was called with custom maxSessionTime
			expect(jwtSign).toHaveBeenCalledWith(
				expect.any(Object),
				expect.any(String),
				expect.objectContaining({
					expiresIn: 7200 // Custom session time
				})
			)
		})
	})
})
