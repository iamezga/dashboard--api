import { Logger } from 'pino'
import { vi } from 'vitest'
import { BadRequestError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthPasswordRecoveryVerifyJobInterface } from './AuthPasswordRecoveryVerifyJobInterface'
import { AuthPasswordRecoveryVerifyUseCase } from './AuthPasswordRecoveryVerifyUseCase'

describe('AuthPasswordRecoveryVerifyUseCase', () => {
	const userRepo = {
		findById: vi.fn()
	}

	const passwordRecoveryTokenRepo = {
		verifyAndGetUserId: vi.fn()
	}

	const logger = {
		info: vi.fn(),
		warn: vi.fn(),
		error: vi.fn()
	} as unknown as Logger

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return userRepo
					if (name === 'passwordRecoveryToken') return passwordRecoveryTokenRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			logger
		}) as unknown as DependencyContainer

	const makeJob = (data: any): AuthPasswordRecoveryVerifyJobInterface =>
		({
			getData: () => data,
			logger
		}) as unknown as AuthPasswordRecoveryVerifyJobInterface

	const validToken = 'a'.repeat(64) // 64 char hex token

	beforeEach(() => {
		vi.clearAllMocks()
	})

	it('should have undefined permission for public use case', () => {
		expect(AuthPasswordRecoveryVerifyUseCase.permission).toBeUndefined()
	})

	it('should return empty permission validation data', async () => {
		const result =
			await AuthPasswordRecoveryVerifyUseCase.getPermissionValidationData(
				{} as any,
				{} as any
			)

		expect(result).toEqual({
			data: {},
			schema: {}
		})
	})

	it('should verify valid token and return masked email', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'john.doe@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)

		const job = makeJob({ token: validToken })
		const result = await useCase.run(job)

		// Verify token lookup via repository
		expect(passwordRecoveryTokenRepo.verifyAndGetUserId).toHaveBeenCalledWith(
			validToken
		)

		// Verify user lookup
		expect(userRepo.findById).toHaveBeenCalledWith('user-123')

		expect(result.data.valid).toBe(true)
		expect(result.data.email).toBe('j*******@example.com') // Masked
		expect(result.data.name).toBe('John Doe')
		expect(result.metadata).toHaveProperty('verifiedAt')
	})

	it('should throw BadRequestError for invalid token', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue(null) // Token not found

		const job = makeJob({ token: validToken })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
		await expect(useCase.run(job)).rejects.toThrow('Invalid or expired')

		// Should log warning
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({ token: validToken.substring(0, 10) }),
			'Invalid or expired token'
		)
	})

	it('should throw BadRequestError for expired token', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue(null) // Expired

		const job = makeJob({ token: validToken })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should throw BadRequestError if user not found', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(null) // User deleted

		const job = makeJob({ token: validToken })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
		await expect(useCase.run(job)).rejects.toThrow('not active')
	})

	it('should throw BadRequestError if user is inactive', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'inactive', // Inactive
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)

		const job = makeJob({ token: validToken })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
		await expect(useCase.run(job)).rejects.toThrow('not active')
	})

	it('should throw BadRequestError if user is deleted', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: new Date() // Deleted
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)

		const job = makeJob({ token: validToken })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should mask email correctly for different formats', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		const testCases = [
			{ email: 'a@example.com', expected: 'a@example.com' }, // Single char
			{ email: 'ab@example.com', expected: 'a*@example.com' },
			{ email: 'john@example.com', expected: 'j***@example.com' },
			{
				email: 'very.long.email@example.com',
				expected: 'v**************@example.com'
			}
		]

		for (const testCase of testCases) {
			const mockUser = {
				id: 'user-123',
				email: testCase.email,
				name: 'Test User',
				status: 'active',
				deletedAt: null
			}

			passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue('user-123')
			userRepo.findById.mockResolvedValue(mockUser)

			const job = makeJob({ token: validToken })
			const result = await useCase.run(job)

			expect(result.data.email).toBe(testCase.expected)

			vi.clearAllMocks()
		}
	})

	it('should log verification process', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryVerifyUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)

		const job = makeJob({ token: validToken })
		await useCase.run(job)

		expect(logger.info).toHaveBeenCalledWith(
			'Verifying password recovery token'
		)
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123' },
			'Recovery token verified successfully'
		)
	})
})
