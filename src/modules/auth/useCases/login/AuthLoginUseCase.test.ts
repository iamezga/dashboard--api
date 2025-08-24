import { BadRequestError } from '../../../../errors'
import { DependencyContainer } from '../../../../services/dependencyContainer'
import { AuthLoginJobInterface } from './AuthLoginJobInterface'
import { AuthLoginUseCase } from './AuthLoginUseCase'

// --- Helpers ---
const makeLoginJob = (
	overrides?: Partial<{ email: string; password: string }>,
	attempts = 1
) => {
	const defaultData = { email: 'john@example.com', password: 'password' }
	const data = { ...defaultData, ...overrides }
	return {
		getData: () => data,
		getAttempts: () => attempts
	} as unknown as AuthLoginJobInterface
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
const userRepo = { findUserAuthDetailsByEmail: jest.fn(), update: jest.fn() }
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
const argon2 = { verify: jest.fn() }
const jwt = { sign: jest.fn() }
const configGet = jest.fn((key: string) => {
	if (key === 'jwt.secret') return 'secret'
	if (key === 'jwt.expiresIn') return '1h'
	return undefined
})

const makeContainer = (): DependencyContainer =>
	({
		repositories: { user: userRepo },
		thirdParties: { argon2, jwt },
		logger,
		config: { get: configGet }
	} as unknown as DependencyContainer)

beforeEach(() => {
	jest.clearAllMocks()
	// Config default valid values
	configGet.mockImplementation((key: string) => {
		if (key === 'jwt.secret') return 'secret'
		if (key === 'jwt.expiresIn') return '1h'
		return undefined
	})
})

describe('AuthLoginUseCase', () => {
	it('Should throw if JWT SECRET is missing', () => {
		configGet.mockImplementation((key: string) =>
			key === 'jwt.secret' ? undefined : '1h'
		)
		const container = makeContainer()
		expect(() => new AuthLoginUseCase(container)).toThrow(
			'JWT SECRET is not defined'
		)
	})

	it('Should throw if JWT EXPIRES IN is missing', () => {
		configGet.mockImplementation((key: string) =>
			key === 'jwt.expiresIn' ? undefined : 'secret'
		)
		const container = makeContainer()
		expect(() => new AuthLoginUseCase(container)).toThrow(
			'JWT EXPIRES IN is not defined'
		)
	})

	it("Should throw BadRequest if the user doesn't exist", async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(null)

		const job = makeLoginJob({ email: 'no@exists.com', password: 'x' })
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(logger.warn).toHaveBeenCalled()
		expect(userRepo.findUserAuthDetailsByEmail).toHaveBeenCalledWith(
			'no@exists.com'
		)
	})

	it('Should throw BadRequest if the user is inactive', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails({ active: false })
		)

		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(logger.warn).toHaveBeenCalled()
	})

	it('Should throw BadRequest if password is invalid', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(false)

		const job = makeLoginJob({ password: 'bad' })
		await expect(useCase.run(job)).rejects.toBeInstanceOf(BadRequestError)
		expect(argon2.verify).toHaveBeenCalledWith('hashed-pass', 'bad')
		expect(logger.warn).toHaveBeenCalled()
	})

	it('Should throw Error if lastLogin update fails', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		userRepo.update.mockResolvedValueOnce(null)

		const job = makeLoginJob()
		await expect(useCase.run(job)).rejects.toThrow(
			'Could not update user login timestamp.'
		)
		expect(userRepo.update).toHaveBeenCalledWith('u1', {
			lastLogin: expect.any(Date)
		})
		expect(logger.error).toHaveBeenCalled()
	})

	it('Should return token and user on successful login', async () => {
		const container = makeContainer()
		const useCase = new AuthLoginUseCase(container)

		userRepo.findUserAuthDetailsByEmail.mockResolvedValueOnce(
			makeUserAuthDetails()
		)
		argon2.verify.mockResolvedValueOnce(true)
		userRepo.update.mockResolvedValueOnce(makeUpdatedUser())
		jwt.sign.mockReturnValueOnce('signed.jwt.token')

		const job = makeLoginJob({}, 2)
		const result = await useCase.run(job)

		expect(argon2.verify).toHaveBeenCalledWith('hashed-pass', 'password')
		expect(userRepo.update).toHaveBeenCalledWith('u1', {
			lastLogin: expect.any(Date)
		})
		expect(jwt.sign).toHaveBeenCalledWith(
			{ userId: 'u1', organizationId: 'org1', roleId: 'role1' },
			'secret',
			{ expiresIn: '1h' }
		)

		expect(result.data).toEqual({
			token: 'signed.jwt.token',
			user: {
				id: 'u1',
				organizationId: 'org1',
				email: 'john@example.com',
				name: 'John',
				surname: 'Doe',
				roleId: 'role1',
				active: true,
				config: {}
			}
		})

		expect(result.metadata).toEqual({
			attempts: 2,
			message: 'Login successful.'
		})
		expect(logger.info).toHaveBeenCalled()
	})
})
