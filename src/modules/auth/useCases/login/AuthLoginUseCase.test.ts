import { Logger } from 'pino'
import { BadRequestError, UnauthorizedError } from '../../../../errors'
import { Job } from '../../../../lib/Job'
import { dayjs } from '../../../../services/dayjs'
import { DependencyContainer } from '../../../../services/dependencyContainer'
import { deepMerge } from '../../../../utils/deepMerge'
import { getTimeInSeconds } from '../../../../utils/getTimeInSeconds'
import { AuthLoginJobInterface } from './AuthLoginJobInterface'
import { AuthLoginUseCase } from './AuthLoginUseCase'

// --- Helpers ---
const makeLoginJob = (
	overrides?: Partial<{ email: string; password: string }>,
	attempts = 1
) => {
	const defaultData = { email: 'john@example.com', password: 'password' }
	const data = { ...defaultData, ...overrides }

	let currentUser: any = null

	return {
		getData: () => data,
		getAttempts: () => attempts,
		setUser: (user: any) => {
			currentUser = user
		},
		getUser: () => currentUser,
		getMeta: () => ({ timestamp: new Date() }),
		logger: {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn()
		}
	} as unknown as AuthLoginJobInterface & {
		logger: Logger
		getMeta: () => Record<string, any>
	}
}

const makeUserAuthDetails = (overrides?: Partial<any>) => ({
	id: 'u1',
	organizationId: 'org1',
	email: 'john@example.com',
	passwordHash: 'hashed-pass',
	active: true,
	name: 'John',
	surname: 'Doe',
	roleId: 'role1',
	config: {},
	lastLogin: null,
	userPermissions: [],
	...overrides
})

const makeUpdatedUser = (overrides?: Partial<any>) => ({
	id: 'u1',
	organizationId: 'org1',
	email: 'john@example.com',
	name: 'John',
	surname: 'Doe',
	roleId: 'role1',
	active: true,
	lastLogin: new Date(),
	config: {},
	createdAt: new Date(),
	updatedAt: new Date(),
	deletedAt: null,
	passwordHash: 'hashed-pass',
	...overrides
})

// --- Mocks ---
const userRepo = {
	findUserAuthDetailsByEmail: jest.fn(),
	update: jest.fn()
}
const roleRepo = {
	findByIdWithPermissions: jest.fn()
}
const sessionRepo = {
	saveUserData: jest.fn().mockResolvedValue(true),
	createSession: jest.fn().mockResolvedValue('session-123'),
	hasActiveSessions: jest.fn().mockResolvedValue(false)
}
const argon2 = { verify: jest.fn() }
const jwt = { sign: jest.fn() }
const ms = jest.fn(_val => 3600000) // 1h in ms
const validator = { validate: jest.fn().mockResolvedValue([]) }
const configGet = jest.fn((key: string) => {
	if (key === 'jwt.secret') return 'secret'
	if (key === 'jwt.expiresIn') return '1h'
	return undefined
})
const auditService = {
	record: jest.fn().mockResolvedValue(undefined)
}

const makeContainer = (): DependencyContainer =>
	({
		repositories: { user: userRepo, role: roleRepo, session: sessionRepo },
		thirdParties: { argon2, jwt, ms, dayjs },
		config: { get: configGet },
		utils: { deepMerge, getTimeInSeconds },
		validator,
		auditService
	} as unknown as DependencyContainer)

beforeEach(() => {
	jest.clearAllMocks()
	configGet.mockImplementation((key: string) => {
		if (key === 'jwt.secret') return 'secret'
		if (key === 'jwt.expiresIn') return '1h'
		return undefined
	})
})

describe('AuthLoginUseCase', () => {
	it('Should throw if JWT SECRET is missing', () => {
		configGet.mockImplementation(key =>
			key === 'jwt.secret' ? undefined : '1h'
		)
		const container = makeContainer()
		expect(() => new AuthLoginUseCase(container)).toThrow(
			'JWT SECRET is not defined'
		)
	})

	it('Should throw if JWT EXPIRES IN is missing', () => {
		configGet.mockImplementation(key =>
			key === 'jwt.expiresIn' ? undefined : 'secret'
		)
		const container = makeContainer()
		expect(() => new AuthLoginUseCase(container)).toThrow(
			'JWT EXPIRES IN is not defined'
		)
	})

	it("Should throw BadRequestError if user doesn't exist", async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(null)
		const job = makeLoginJob({ email: 'no@exists.com' })
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(job.logger.warn).toHaveBeenCalled()
	})

	it('Should throw BadRequestError if user inactive', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails({ active: false })
		)
		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(job.logger.warn).toHaveBeenCalled()
	})

	it('Should throw BadRequestError if user.deletedAt exists', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails({ deletedAt: new Date() })
		)
		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(job.logger.warn).toHaveBeenCalled()
	})

	it('Should throw BadRequestError if password invalid', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(false)
		const job = makeLoginJob({ password: 'wrong' })
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(argon2.verify).toHaveBeenCalledWith('hashed-pass', 'wrong')
		expect(job.logger.warn).toHaveBeenCalled()
	})

	it('Should throw UnauthorizedError if no roleId', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails({ roleId: null })
		)
		argon2.verify.mockResolvedValueOnce(true)
		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('Should throw UnauthorizedError if role inactive', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: false,
			rolePermissions: []
		})
		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('Should throw UnauthorizedError if lastLogin update fails', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, config: {} },
					config: {}
				}
			]
		})
		userRepo.update.mockResolvedValueOnce(null)

		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(Error)
	})

	it('Should login successfully and return token', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{ permission: { key: 'auth.login', active: true }, config: {} }
			]
		})
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const job = makeLoginJob({}, 2)
		const result = await useCase.run(job)

		expect(sessionRepo.saveUserData).toHaveBeenCalledWith(
			'u1',
			expect.objectContaining({ id: 'u1', email: 'john@example.com' }),
			expect.any(Number)
		)
		expect(sessionRepo.createSession).toHaveBeenCalledWith(
			'u1',
			expect.objectContaining({ userId: 'u1' }),
			expect.any(Number)
		)

		expect(result.data).toEqual({
			token: 'signed.jwt.token',
			user: expect.objectContaining({
				id: 'u1',
				email: 'john@example.com'
			})
		})

		expect(result.metadata).toEqual({
			attempts: 2,
			message: 'Login successful.'
		})
		expect(job.logger.info).toHaveBeenCalled()
	})

	it('Should include accessDay and accessTime in validation data if conditions enabled', async () => {
		const roleRepoMock = {
			findByIdWithPermissions: jest.fn().mockResolvedValueOnce({
				active: true,
				rolePermissions: [
					{
						permission: {
							key: 'auth.login',
							active: true,
							deletedAt: null,
							config: {
								conditions: {
									accessDays: { enabled: true, values: ['Monday', 'Tuesday'] },
									accessTime: {
										enabled: true,
										options: { from: '08:00', to: '18:00' }
									}
								}
							}
						},
						config: {}
					}
				]
			})
		}

		const container = makeContainer() as any
		container.repositories.role = roleRepoMock

		const useCase = new AuthLoginUseCase(container)

		const userAuthDetails = makeUserAuthDetails({ roleId: 'role1' })
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userAuthDetails)
		argon2.verify.mockResolvedValueOnce(true)
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const job = makeLoginJob()
		const spyValidate = jest
			.spyOn(container.validator, 'validate')
			.mockResolvedValue([])

		await useCase.run(job)

		const validationData = spyValidate.mock.calls[0][0]
		expect(validationData).toHaveProperty('accessDay')
		expect(validationData).toHaveProperty('accessTime')
	})

	it('Should throw UnauthorizedError if validation fails (accessDay or accessTime)', async () => {
		const roleRepoMock = {
			findByIdWithPermissions: jest.fn().mockResolvedValueOnce({
				active: true,
				rolePermissions: [
					{
						permission: {
							key: 'auth.login',
							active: true,
							deletedAt: null,
							config: {
								conditions: {
									accessDays: { enabled: true, values: ['Sunday'] },
									accessTime: { enabled: false, options: {} }
								}
							}
						},
						config: {}
					}
				]
			})
		}

		const container = makeContainer() as any
		container.repositories.role = roleRepoMock

		container.thirdParties.dayjs = jest.fn(() => ({
			format: jest.fn(() => 'Monday')
		}))

		const useCase = new AuthLoginUseCase(container)

		const userAuthDetails = makeUserAuthDetails({ roleId: 'role1' })
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userAuthDetails)
		argon2.verify.mockResolvedValueOnce(true)
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const job = makeLoginJob()

		jest
			.spyOn(container.validator, 'validate')
			.mockResolvedValueOnce([
				{ field: 'accessDay', message: 'Day not allowed' }
			])

		await expect(useCase.run(job)).rejects.toBeInstanceOf(UnauthorizedError)
	})

	it('Should handle accessDays and accessTime disabled', async () => {
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{
					permission: {
						key: 'auth.login',
						active: true,
						deletedAt: null,
						config: {
							conditions: {
								accessDays: { enabled: false, values: ['Monday'] },
								accessTime: {
									enabled: false,
									options: { from: '08:00', to: '18:00' }
								}
							}
						}
					},
					config: {}
				}
			]
		})
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const container = makeContainer() as any
		const useCase = new AuthLoginUseCase(container)
		const job = makeLoginJob()

		await useCase.run(job)

		const validationData = container.validator.validate.mock.calls[0][0]
		expect(validationData).not.toHaveProperty('accessDay')
		expect(validationData).not.toHaveProperty('accessTime')
	})

	it('Should use default maxSessionTime if not set in permission', async () => {
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, config: {} },
					config: {}
				}
			]
		})

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const container = makeContainer()
		container.thirdParties.ms = jest.fn().mockReturnValue(0)
		const useCase = new AuthLoginUseCase(container)

		const job = makeLoginJob()
		await useCase.run(job)

		expect(sessionRepo.createSession).toHaveBeenCalledWith(
			expect.any(String),
			expect.objectContaining({
				maxSessionTime: 3600
			}),
			3600
		)
	})

	it('Should skip inactive or deleted permissions', async () => {
		const container = makeContainer() as any
		const useCase = new AuthLoginUseCase(container)

		const userAuthDetails = makeUserAuthDetails({ roleId: 'role1' })
		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(userAuthDetails)
		argon2.verify.mockResolvedValueOnce(true)

		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: false, config: {} },
					config: {}
				},
				{
					permission: {
						key: 'auth.login2',
						active: true,
						deletedAt: new Date(),
						config: {}
					},
					config: {}
				}
			]
		})

		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const job = makeLoginJob()
		await useCase.run(job)

		const mergedPermissions = (job as unknown as Job).getUser().permissions
		expect(mergedPermissions).toEqual({})
	})
	it('Should merge rolePermissions and userPermissions', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		const rolePermission = [
			{
				permission: { key: 'user.custom', active: true, deletedAt: null },
				config: { fromUser: true }
			},
			{
				permission: { key: 'auth.login', active: true, deletedAt: null },
				config: { fromRole: true }
			}
		]

		const userPermission = [
			{
				permission: { key: 'user.custom', active: true, deletedAt: null },
				config: { fromUser: false }
			},
			{
				permission: { key: 'user.custom2', active: false, deletedAt: null },
				config: {}
			}
		]

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails({
				roleId: 'role1',
				userPermissions: userPermission
			})
		)

		argon2.verify.mockResolvedValueOnce(true)

		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: rolePermission
		})

		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		await useCase.run(makeLoginJob())

		const sessionUser = sessionRepo.saveUserData.mock.calls[0][1]

		expect(sessionUser.permissions['auth.login']).toBeDefined()
		expect(sessionUser.permissions['user.custom']).toBeDefined()
		expect(sessionUser.permissions['auth.login'].config).toEqual({
			fromRole: true
		})
		expect(sessionUser.permissions['user.custom'].config).toEqual({
			fromUser: false
		})
	})
	it('Should throw UnauthorizedError if user already has active session and multiple not allowed', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{
					permission: {
						key: 'auth.login',
						active: true,
						config: { allowMultipleSession: false }
					},
					config: {}
				}
			]
		})
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		sessionRepo.hasActiveSessions.mockResolvedValueOnce(true)

		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(UnauthorizedError)
	})
	it('Should throw UnauthorizedError if createSession fails', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{
					permission: { key: 'auth.login', active: true, config: {} },
					config: {}
				}
			]
		})
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		sessionRepo.createSession.mockResolvedValueOnce(null) // fuerza fallo

		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(Error)
	})

	it('Should call auditService.record after successful login', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		roleRepo.findByIdWithPermissions.mockResolvedValueOnce({
			active: true,
			rolePermissions: [
				{ permission: { key: 'auth.login', active: true }, config: {} }
			]
		})
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const job = makeLoginJob()
		job.getMeta = jest.fn().mockReturnValue({
			userAgent: 'jest-test-agent'
		})
		await useCase.run(job)

		expect(container.auditService.record).toHaveBeenCalledWith(
			'auth.login',
			job,
			'user',
			'u1',
			expect.objectContaining({
				userAgent: 'jest-test-agent',
				loggedAt: expect.any(Date)
			})
		)
	})
})
