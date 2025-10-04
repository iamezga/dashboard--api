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
			format: jest.fn((pattern: string) => {
				if (pattern === 'dddd') return 'Monday' // día de la semana
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
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			libs,
			services: { auditService },
			config,
			validator,
			utils,
			logger
		} as unknown as DependencyContainer)

	const makeJob = (data: any, permissions = {}): AuthLoginJobInterface =>
		({
			getData: () => data,
			getMeta: () => ({ timestamp: new Date(), userAgent: 'agent' }),
			getUser: () => ({ permissions }),
			setUser: jest.fn(),
			getAttempts: () => 1,
			logger
		} as any)

	beforeEach(() => {
		jest.clearAllMocks()

		config = {
			get: jest.fn((key: string) => {
				if (key === 'jwt.secret') return 'super-secret'
				if (key === 'jwt.expiresIn') return '1h'
				return null
			})
		}
	})

	it('should throw if JWT SECRET is missing', async () => {
		config.get.mockReturnValueOnce(null)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'a@b.com', password: '123' }))
		).rejects.toThrow('JWT SECRET is not defined')
	})

	it('should throw if JWT EXPIRES IN is missing', async () => {
		config.get.mockImplementation((key: string) =>
			key === 'jwt.secret' ? 'super-secret' : null
		)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'a@b.com', password: '123' }))
		).rejects.toThrow('JWT EXPIRES IN is not defined')
	})

	it('should throw BadRequestError for non-existent user', async () => {
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(null)
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'nouser@mail.com', password: '123' }))
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
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
		).rejects.toBeInstanceOf(BadRequestError)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce({
			id: 'u2',
			email: 'user@mail.com',
			active: true,
			deletedAt: new Date()
		})
		await expect(
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
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
			useCase.run(makeJob({ email: 'user@mail.com', password: 'wrong' }))
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
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
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
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw UnauthorizedError if validator returns errors', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
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
			{ field: 'accessDay', message: 'not allowed' }
		])
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw UnauthorizedError if multiple sessions not allowed and session exists', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
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
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
		).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('should throw Error if update user lastLogin fails', async () => {
		const userData = {
			id: 'u1',
			email: 'user@mail.com',
			passwordHash: 'hash',
			active: true,
			deletedAt: null,
			roleId: 'r1',
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
		userRepo.update.mockResolvedValueOnce(null) // Fail update
		sessionRepo.createSession.mockResolvedValueOnce('sess123')
		const useCase = new AuthLoginUseCase(makeContainer())
		await expect(
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
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
			useCase.run(makeJob({ email: 'user@mail.com', password: '123' }))
		).rejects.toThrow(/Could not create user session/)
	})

	it('should login successfully with accessDays and accessTime enabled', async () => {
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
						config: {
							conditions: {
								accessDays: { enabled: true, values: ['Monday'] },
								accessTime: {
									enabled: true,
									options: { from: '00:00', to: '23:59' }
								}
							},
							allowMultipleSessions: true
						}
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
			makeJob({ email: 'user@mail.com', password: '123' })
		)

		expect(result.data.token).toBe('token123')
		expect(result.data.user.id).toBe('u1')
		expect(mockSessionRepo.createSession).toHaveBeenCalled()
	})

	it('should include accessDay and accessTime when conditions enabled', async () => {
		const metaTimestamp = new Date('2025-09-20T12:34:00')
		const job = makeJob({ email: 'user@mail.com', password: '123' }) as any
		job.getMeta = () => ({ timestamp: metaTimestamp, userAgent: 'agent' })

		const permissions = {
			[AuthLoginUseCase.permission]: {
				config: {
					conditions: {
						accessDays: { enabled: true, values: ['Monday', 'Tuesday'] },
						accessTime: {
							enabled: true,
							options: { from: '08:00', to: '18:00' }
						}
					}
				}
			}
		}
		job.getUser = () => ({ permissions })

		const result = await AuthLoginUseCase.getPermissionValidationData(
			job,
			makeContainer()
		)
		expect(result.data.accessDay).toBe('Monday')
		expect(result.data.accessTime).toBe('12:34')
		expect(result.schema.accessDay.values).toEqual(['Monday', 'Tuesday'])
		expect(result.schema.accessTime.rules).toHaveLength(2)
	})

	it('should skip accessDay and accessTime if conditions disabled', async () => {
		const job = makeJob({ email: 'user@mail.com', password: '123' }) as any
		job.getMeta = () => ({ timestamp: new Date(), userAgent: 'agent' })

		const permissions = {
			[AuthLoginUseCase.permission]: {
				config: {
					conditions: {
						accessDays: { enabled: false, values: ['Monday'] },
						accessTime: {
							enabled: false,
							options: { from: '08:00', to: '18:00' }
						}
					}
				}
			}
		}

		job.getUser = () => ({ permissions })

		const result = await AuthLoginUseCase.getPermissionValidationData(
			job,
			makeContainer()
		)
		expect(result.data.accessDay).toBeUndefined()
		expect(result.data.accessTime).toBeUndefined()
		expect(result.schema.accessDay).toBeUndefined()
		expect(result.schema.accessTime).toBeUndefined()
	})

	it('should skip accessDay and accessTime if no conditions present', async () => {
		const job = makeJob({ email: 'user@mail.com', password: '123' }) as any
		job.getMeta = () => ({ timestamp: new Date(), userAgent: 'agent' })

		const permissions = {
			[AuthLoginUseCase.permission]: {
				config: {} // no conditions
			}
		}
		job.getUser = () => ({ permissions })

		const result = await AuthLoginUseCase.getPermissionValidationData(
			job,
			makeContainer()
		)

		expect(result.data.accessDay).toBeUndefined()
		expect(result.data.accessTime).toBeUndefined()
		expect(result.schema.accessDay).toBeUndefined()
		expect(result.schema.accessTime).toBeUndefined()
	})

	it('should merge only active and non-deleted permissions inside run', async () => {
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
					permission: { key: 'perm1', active: true, deletedAt: null },
					config: {}
				},
				{
					permission: { key: 'perm2', active: false, deletedAt: null },
					config: {}
				},
				{
					permission: { key: 'perm3', active: true, deletedAt: new Date() },
					config: {}
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
					permission: { key: 'perm4', active: true, deletedAt: null },
					config: {}
				}
			]
		})
		validator.validate.mockResolvedValueOnce([]) // no errors
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJob({ email: 'user@mail.com', password: '123' })
		)

		expect(result.data.token).toBeDefined()
	})

	it('should correctly skip inactive/deleted and merge active permissions inside run', async () => {
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
					permission: { key: 'permActive', active: true, deletedAt: null },
					config: { foo: 'bar' }
				},
				{
					permission: { key: 'permInactive', active: false, deletedAt: null },
					config: {}
				},
				{
					permission: {
						key: 'permDeleted',
						active: true,
						deletedAt: new Date()
					},
					config: {}
				}
			]
		}

		const rolePermissions = [
			{
				permission: { key: 'permRoleActive', active: true, deletedAt: null },
				config: { baz: 'qux' }
			},
			{
				permission: { key: 'permRoleInactive', active: false, deletedAt: null },
				config: {}
			}
		]

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userData)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			id: 'r1',
			active: true,
			rolePermissions
		})
		validator.validate.mockResolvedValueOnce([])
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(false)
		userRepo.update.mockResolvedValueOnce(userData)
		sessionRepo.saveUserData.mockResolvedValueOnce(undefined)
		sessionRepo.createSession.mockResolvedValueOnce('sess123')

		const deepMergeSpy = jest.spyOn(makeContainer().utils, 'deepMerge')

		const result = await new AuthLoginUseCase(makeContainer()).run(
			makeJob({ email: 'user@mail.com', password: '123' })
		)

		expect(deepMergeSpy).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'permActive' }),
			{ config: { foo: 'bar' } }
		)
		expect(deepMergeSpy).toHaveBeenCalledWith(
			expect.objectContaining({ key: 'permRoleActive' }),
			{ config: { baz: 'qux' } }
		)

		expect(result.data.token).toBeDefined()
	})
})
