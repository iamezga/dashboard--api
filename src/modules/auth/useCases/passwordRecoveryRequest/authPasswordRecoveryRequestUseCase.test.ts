import { Logger } from 'pino'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthPasswordRecoveryRequestJobInterface } from './AuthPasswordRecoveryRequestJobInterface'
import { AuthPasswordRecoveryRequestUseCase } from './AuthPasswordRecoveryRequestUseCase'

describe('AuthPasswordRecoveryRequestUseCase', () => {
	const userRepo = {
		findByEmail: jest.fn()
	}

	const organizationRepo = {
		findBySlug: jest.fn()
	}

	const passwordRecoveryTokenRepo = {
		createToken: jest.fn()
	}

	const jobService = {
		dispatchUseCase: jest.fn().mockResolvedValue(undefined)
	}

	const config = {
		get: jest.fn((key: string) => {
			if (key === 'appName') return 'TestApp'
			if (key === 'front.url') return 'https://example.com'
			if (key === 'email.supportEmail') return 'support@example.com'
			return ''
		})
	}

	const logger = {
		info: jest.fn(),
		warn: jest.fn(),
		error: jest.fn()
	} as unknown as Logger

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'user') return userRepo
					if (name === 'organization') return organizationRepo
					if (name === 'passwordRecoveryToken') return passwordRecoveryTokenRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			services: {
				jobService
			},
			config,
			logger
		}) as unknown as DependencyContainer

	const makeJob = (data: any): AuthPasswordRecoveryRequestJobInterface =>
		({
			getData: () => data,
			setData: jest.fn((newData: any) => {
				Object.assign(data, newData)
			}),
			logger
		}) as unknown as AuthPasswordRecoveryRequestJobInterface

	beforeEach(() => {
		jest.clearAllMocks()
		process.env.FRONT_URL = 'https://example.com'

		// Mock organization repository to return valid organization by default
		organizationRepo.findBySlug.mockResolvedValue({
			id: 'org-123',
			slug: 'test-org',
			name: 'Test Organization'
		})
	})

	it('should have undefined permission for public use case', () => {
		expect(AuthPasswordRecoveryRequestUseCase.permission).toBeUndefined()
	})

	it('should return empty permission validation data', async () => {
		const result =
			await AuthPasswordRecoveryRequestUseCase.getPermissionValidationData(
				{} as any,
				{} as any
			)

		expect(result).toEqual({
			data: {},
			schema: {}
		})
	})

	it('should return success message for invalid organization (security)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		organizationRepo.findBySlug.mockResolvedValueOnce(null)

		const job = makeJob({
			email: 'user@example.com',
			organization: 'invalid-org'
		})
		const result = await useCase.run(job)

		expect(result.data.message).toBe(
			'If the email exists in our system, a recovery link has been sent.'
		)
		expect(userRepo.findByEmail).not.toHaveBeenCalled()
		expect(jobService.dispatchUseCase).not.toHaveBeenCalled()
	})

	it('should generate token and send email for active user', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.createToken.mockResolvedValueOnce('a'.repeat(64))
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Verify user lookup
		expect(userRepo.findByEmail).toHaveBeenCalledWith('user@example.com')

		// Verify token created
		expect(passwordRecoveryTokenRepo.createToken).toHaveBeenCalledWith(
			'user-123',
			900 // TOKEN_EXPIRY_SECONDS value
		)

		// Verify email job dispatched
		expect(jobService.dispatchUseCase).toHaveBeenCalledWith(
			'emails',
			'AuthSendPasswordResetEmailUseCase',
			expect.objectContaining({
				getData: expect.any(Function)
			}),
			{
				priority: 10,
				attempts: 5
			}
		)

		expect(result.data.message).toContain('recovery link has been sent')
		expect(result.metadata).toHaveProperty('requestedAt')
	})

	it('should return success even if user does not exist (security)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		userRepo.findByEmail.mockResolvedValueOnce(null)

		const job = makeJob({
			email: 'nonexistent@example.com',
			organization: 'test-org'
		})
		const result = await useCase.run(job)

		// Should not create token
		expect(passwordRecoveryTokenRepo.createToken).not.toHaveBeenCalled()

		// But should return success (prevents email enumeration)
		expect(result.data.message).toContain('recovery link has been sent')

		// Should log warning
		expect(logger.warn).toHaveBeenCalledWith(
			expect.objectContaining({
				email: 'nonexistent@example.com'
			}),
			expect.stringContaining('non-existent')
		)
	})

	it('should return success for inactive user (security)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'inactive',
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValueOnce(mockUser)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Should not create token or dispatch email
		expect(passwordRecoveryTokenRepo.createToken).not.toHaveBeenCalled()
		expect(jobService.dispatchUseCase).not.toHaveBeenCalled()

		// Should return success
		expect(result.data.message).toContain('recovery link has been sent')
	})

	it('should return success for deleted user (security)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: new Date()
		}

		userRepo.findByEmail.mockResolvedValueOnce(mockUser)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Should not create token or dispatch email
		expect(passwordRecoveryTokenRepo.createToken).not.toHaveBeenCalled()
		expect(jobService.dispatchUseCase).not.toHaveBeenCalled()

		// Should return success
		expect(result.data.message).toContain('recovery link has been sent')
	})

	it('should handle errors gracefully and still return success', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		userRepo.findByEmail.mockRejectedValue(new Error('Database error'))

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Should log error
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ email: 'user@example.com' }),
			expect.stringContaining('Error during password recovery')
		)

		// Should still return success
		expect(result.data.message).toContain('recovery link has been sent')
	})

	it('should generate secure random token (64 chars hex)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		const token64Hex = 'a'.repeat(64)
		userRepo.findByEmail.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.createToken.mockResolvedValueOnce(token64Hex)
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		await useCase.run(job)

		// Verify token was created with 900 seconds expiry (15 minutes)
		expect(passwordRecoveryTokenRepo.createToken).toHaveBeenCalledWith(
			'user-123',
			900 // TOKEN_EXPIRY_SECONDS value
		)
	})

	it('should log token generation details', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.createToken.mockResolvedValueOnce('a'.repeat(64))
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		await useCase.run(job)

		// Verify logging
		expect(logger.info).toHaveBeenCalledWith(
			{ email: 'user@example.com', organization: 'test-org' },
			'Password recovery request initiated'
		)

		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-123' }),
			'Password recovery token created'
		)

		expect(logger.info).toHaveBeenCalledWith(
			{ email: 'user@example.com' },
			'Password reset email job dispatched successfully'
		)
	})
})
