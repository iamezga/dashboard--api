import { BadRequestError } from '../../../../errors'
import { DependencyContainer } from '../../../../services/dependencyContainer'
import { UserCreateJobInterface } from './UserCreateJobInterface'
import { UserCreateUseCase } from './UserCreateUseCase'

const makeJob = (
	data: any,
	attempts = 1,
	permissions: Record<string, boolean> = {}
) =>
	({
		getData: () => data,
		getAttempts: () => attempts,
		getUser: () => ({ permissions })
	} as unknown as UserCreateJobInterface)

describe('UserCreateUseCase', () => {
	const userRepo = {
		findByEmail: jest.fn(),
		create: jest.fn()
	}

	const roleRepo = {
		findById: jest.fn()
	}

	const organizationRepo = {
		findById: jest.fn()
	}

	const logger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	}

	const argon2 = {
		hash: jest.fn()
	}

	const makeContainer = (): DependencyContainer =>
		({
			repositories: {
				user: userRepo,
				role: roleRepo,
				organization: organizationRepo
			},
			thirdParties: { argon2 },
			logger
		} as unknown as DependencyContainer)

	const baseRole = { id: 'role1', active: true }
	const baseOrganization = { id: 'org1', active: true }

	beforeEach(() => {
		jest.clearAllMocks()
		userRepo.findByEmail.mockResolvedValue(null)
		roleRepo.findById.mockResolvedValue(baseRole)
		organizationRepo.findById.mockResolvedValue(baseOrganization)
		argon2.hash.mockResolvedValue('hashed-pass')
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
			organizationId: 'org1'
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
		expect(logger.info).toHaveBeenCalledWith(
			'User new@mail.com created successfully.'
		)
	})
})
