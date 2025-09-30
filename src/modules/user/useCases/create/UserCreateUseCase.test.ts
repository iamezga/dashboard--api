import { Logger } from 'pino'
import { DependencyContainer } from '../../../../core/dependencyContainer'
import { BadRequestError } from '../../../../errors'
import { JobInterface } from '../../../../types/job/JobInterface'
import { Permission } from '../../../permission/entities/Permission'
import { AuthenticatedUser } from '../../../user/entities/User'
import { UserCreateJobInterface } from './UserCreateJobInterface'
import { UserCreateUseCase } from './UserCreateUseCase'

const makeJob = (
	data: any,
	options: {
		attempts?: number
		user?: Partial<AuthenticatedUser>
		publicUser?: boolean
	} = {}
) =>
	({
		getData: () => data,
		getMeta: () => ({ ip: '127.0.0.1' }),
		getAttempts: () => options.attempts ?? 1,
		getUser: () => ({
			id: 'user-id',
			organizationId: 'user-org',
			permissions: {},
			...options.user
		}),
		getPublicUser: () => options.publicUser ?? true, // By default, assume user context should be passed
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
	const baseOrganization = { id: 'org1' }
	const userOrganization = { id: 'user-org' }

	beforeEach(() => {
		jest.clearAllMocks()
		;(userRepo.findByEmail as jest.Mock).mockResolvedValue(null)
		;(roleRepo.findById as jest.Mock).mockImplementation(id =>
			id === 'role1' ? Promise.resolve(baseRole) : Promise.resolve(null)
		)
		;(organizationRepo.findById as jest.Mock).mockImplementation(id => {
			if (id === 'org1') return Promise.resolve(baseOrganization)
			if (id === 'user-org') return Promise.resolve(userOrganization)
			return Promise.resolve(null)
		})
		;(argon2.hash as jest.Mock).mockResolvedValue('hashed-pass')
	})

	it('should have a static permission defined', () => {
		expect(UserCreateUseCase.permission).toBe('user.create') // This is a simple check
	})

	it('should build permission validation schema and data correctly', async () => {
		const job = makeJob(
			{},
			{
				user: {
					permissions: {
						'user.create': {} as Permission,
						'user.update': {} as Permission
					}
				}
			}
		)

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
		} as any)

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
		} as any)

		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(roleRepo.findById).toHaveBeenCalledWith('invalid', 'org1')
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
		} as any)

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
				surname: 'Doe',
				active: true
			},
			{ attempts: 2 }
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
				meta: expect.any(Object),
				user: expect.objectContaining({ id: 'user-id' })
			}
		}
		expect(jobService.dispatch).toHaveBeenCalledWith(
			'emails',
			'UserSendWelcomeEmailUseCase',
			expectedPayload
		)
	})

	it('should use the requesting user organizationId if not provided in payload', async () => {
		const container = makeContainer()
		const useCase = new UserCreateUseCase(container)

		const createdUser = {
			id: 'u2',
			email: 'new2@mail.com',
			roleId: 'role1',
			organizationId: 'user-org', // Should be the user's org
			name: 'Jane',
			surname: 'Doe',
			active: true
		}
		userRepo.create.mockResolvedValueOnce(createdUser)

		const job = makeJob(
			{
				email: 'new2@mail.com',
				password: 'secret',
				roleId: 'role1',
				// No organizationId provided in payload
				name: 'Jane',
				surname: 'Doe'
			},
			{ user: { id: 'user-id', organizationId: 'user-org', permissions: {} } }
		)

		await useCase.run(job)

		// Verify that the role was looked up in the user's organization
		expect(roleRepo.findById).toHaveBeenCalledWith('role1', 'user-org')

		// Verify the user was created in the user's organization
		expect(userRepo.create).toHaveBeenCalledWith(
			expect.objectContaining({
				organizationId: 'user-org'
			})
		)
	})

	it('should not include user context in dispatched job if getPublicUser is false', async () => {
		const container = makeContainer()
		const useCase = new UserCreateUseCase(container)

		const createdUser = {
			id: 'u3',
			email: 'new3@mail.com',
			roleId: 'role1',
			organizationId: 'org1'
		}
		userRepo.create.mockResolvedValueOnce(createdUser)

		const job = makeJob(
			{
				email: 'new3@mail.com',
				password: 'secret',
				roleId: 'role1',
				organizationId: 'org1',
				name: 'Sam'
			},
			{ publicUser: false } // Explicitly set to false
		)

		await useCase.run(job)

		const expectedPayload = {
			jobType: 'useCase',
			useCaseName: 'UserSendWelcomeEmailUseCase',
			jobData: {
				payload: job.getData(),
				meta: expect.any(Object),
				user: undefined // The user context should be undefined
			}
		}
		expect(jobService.dispatch).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			expectedPayload
		)
	})
})
