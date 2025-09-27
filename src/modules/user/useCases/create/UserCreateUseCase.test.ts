import { Logger } from 'pino'
import { DependencyContainer } from '../../../../core/dependencyContainer'
import { BadRequestError } from '../../../../errors'
import { JobInterface } from '../../../../types/job/JobInterface'
import { UserCreateJobInterface } from './UserCreateJobInterface'
import { UserCreateUseCase } from './UserCreateUseCase'

const makeJob = (
	data: any,
	attempts = 1,
	permissions: Record<string, boolean> = {}
) =>
	({
		getData: () => data,
		getMeta: () => ({ ip: '127.0.0.1' }),
		getAttempts: () => attempts,
		getUser: () => ({ id: 'user-id', permissions }),
		getPublicUser: () => true, // By default, assume user context should be passed
		logger: {
			info: jest.fn(),
			warn: jest.fn(),
			error: jest.fn(),
			child: jest.fn().mockReturnThis()
		} as unknown as Logger
	} as unknown as UserCreateJobInterface & JobInterface & { logger: Logger })

describe('UserCreateUseCase', () => {
	const userRepo = {
		findByEmail: jest.fn(),
		findById: jest.fn(),
		create: jest.fn()
	}

	const roleRepo = {
		findById: jest.fn()
	}

	const organizationRepo = {
		findById: jest.fn()
	}

	const jobService = {
		dispatch: jest.fn()
	}

	const globalLogger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn(),
		child: jest.fn().mockReturnThis()
	}

	const argon2 = {
		hash: jest.fn()
	}

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return userRepo
					if (name === 'role') return roleRepo
					if (name === 'organization') return organizationRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			libs: { argon2 },
			logger: globalLogger,
			services: { jobService }
		} as unknown as DependencyContainer)

	const baseRole = { id: 'role1', active: true }
	const baseOrganization = { id: 'org1', active: true }

	beforeEach(() => {
		jest.clearAllMocks()
		;(userRepo.findByEmail as jest.Mock).mockResolvedValue(null)
		;(roleRepo.findById as jest.Mock).mockImplementation(id =>
			id === 'role1' ? Promise.resolve(baseRole) : Promise.resolve(null)
		)
		;(organizationRepo.findById as jest.Mock).mockImplementation(id =>
			id === 'org1' ? Promise.resolve(baseOrganization) : Promise.resolve(null)
		)
		;(argon2.hash as jest.Mock).mockResolvedValue('hashed-pass')
	})

	it('should have a static permission defined', () => {
		expect(UserCreateUseCase.permission).toBe('user.create')
	})

	it('should build permission validation schema and data correctly', async () => {
		const job = makeJob({}, 1, { 'user.create': true, 'user.update': true })
		const result = await UserCreateUseCase.getPermissionValidationData(
			job,
			{} as any
		)

		expect(result).toEqual({
			data: { permission: 'user.create' },
			schema: {
				permission: {
					type: 'enum',
					values: ['user.create', 'user.update']
				}
			}
		})
	})

	it('Should throw BadRequest if email is already in use', async () => {
		const container = makeContainer()
		const useCase = new UserCreateUseCase(container)

		userRepo.findByEmail.mockResolvedValueOnce({
			id: 'u1',
			email: 'taken@mail.com'
		})

		const job = makeJob({
			email: 'taken@mail.com',
			password: 'secret',
			roleId: 'role1',
			organizationId: 'org1'
		})

		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(userRepo.findByEmail).toHaveBeenCalledWith('taken@mail.com')
	})

	it('Should throw BadRequest if role does not exist or is inactive', async () => {
		const container = makeContainer()
		const useCase = new UserCreateUseCase(container)

		roleRepo.findById.mockResolvedValueOnce(null)

		const job = makeJob({
			email: 'new@mail.com',
			password: 'secret',
			roleId: 'invalid',
			organizationId: 'org1',
			name: 'John',
			surname: 'Doe'
		})

		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(roleRepo.findById).toHaveBeenCalledWith('invalid')
	})

	it('Should throw BadRequest if organization does not exist', async () => {
		const container = makeContainer()
		const useCase = new UserCreateUseCase(container)

		organizationRepo.findById.mockResolvedValueOnce(null)

		const job = makeJob({
			email: 'new@mail.com',
			password: 'secret',
			roleId: 'role1',
			organizationId: 'invalidOrg'
		})

		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(organizationRepo.findById).toHaveBeenCalledWith('invalidOrg')
	})

	it('Should create user successfully', async () => {
		const container = makeContainer()
		const useCase = new UserCreateUseCase(container)

		const createdUser = {
			id: 'u1',
			email: 'new@mail.com',
			roleId: 'role1',
			organizationId: 'org1',
			name: 'John',
			surname: 'Doe',
			active: true,
			config: {},
			passwordHash: 'hashed-pass',
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}

		userRepo.create.mockResolvedValueOnce(createdUser)

		const job = makeJob(
			{
				email: 'new@mail.com',
				password: 'secret',
				roleId: 'role1',
				organizationId: 'org1',
				name: 'John',
				surname: 'Doe'
			},
			2
		)

		const result = await useCase.run(job)

		expect(argon2.hash).toHaveBeenCalledWith('secret')
		expect(userRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'new@mail.com',
				passwordHash: 'hashed-pass',
				roleId: 'role1',
				organizationId: 'org1',
				active: true,
				config: {}
			})
		)
		expect(result.data).toEqual(createdUser)
		expect(result.metadata).toEqual({
			attempts: 2,
			message: 'User created successfully.'
		})
		expect(job.logger.info).toHaveBeenCalledWith(
			'User new@mail.com created successfully.'
		)

		const expectedPayload = {
			jobType: 'useCase',
			useCaseName: 'UserSendWelcomeEmailUseCase',
			jobData: {
				payload: job.getData(),
				meta: job.getMeta(),
				user: { id: 'user-id', permissions: {} }
			}
		}
		expect(jobService.dispatch).toHaveBeenCalledWith(
			'emails',
			'UserSendWelcomeEmailUseCase',
			expectedPayload
		)
	})
})
