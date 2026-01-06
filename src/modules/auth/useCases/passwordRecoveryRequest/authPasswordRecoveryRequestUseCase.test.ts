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

	const redisClient = {
		setEx: jest.fn(),
		get: jest.fn(),
		del: jest.fn(),
		keys: jest.fn()
	}

	const emailService = {
		send: jest.fn(),
		sendHtml: jest.fn()
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
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			databaseManager: {
				get: (name: string) => {
					if (name === 'redis') return redisClient
					throw new Error(`Database ${name} not mocked`)
				}
			},
			services: {
				emailService,
				jobService
			},
			config,
			logger
		} as unknown as DependencyContainer)

	const makeJob = (data: any): AuthPasswordRecoveryRequestJobInterface =>
		({
			getData: () => data,
			setData: jest.fn((newData: any) => {
				Object.assign(data, newData)
			}),
			logger
		} as unknown as AuthPasswordRecoveryRequestJobInterface)

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
			active: true,
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValue(mockUser)
		redisClient.setEx.mockResolvedValue('OK')
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Verify user lookup
		expect(userRepo.findByEmail).toHaveBeenCalledWith(
			'user@example.com',
			'org-123'
		)

		// Verify token stored in Redis
		expect(redisClient.setEx).toHaveBeenCalledWith(
			expect.stringContaining('password_recovery:'),
			900, // 15 minutes
			'user-123'
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

		userRepo.findByEmail.mockResolvedValue(null)

		const job = makeJob({
			email: 'nonexistent@example.com',
			organization: 'test-org'
		})
		const result = await useCase.run(job)

		// Should not send email
		expect(emailService.send).not.toHaveBeenCalled()

		// Should not store token
		expect(redisClient.setEx).not.toHaveBeenCalled()

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
			active: false,
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValue(mockUser)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Should not send email or store token
		expect(emailService.send).not.toHaveBeenCalled()
		expect(redisClient.setEx).not.toHaveBeenCalled()

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
			active: true,
			deletedAt: new Date()
		}

		userRepo.findByEmail.mockResolvedValue(mockUser)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		const result = await useCase.run(job)

		// Should not send email or store token
		expect(emailService.send).not.toHaveBeenCalled()
		expect(redisClient.setEx).not.toHaveBeenCalled()

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
			active: true,
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValue(mockUser)
		redisClient.setEx.mockResolvedValue('OK')
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		await useCase.run(job)

		// Verify token is 64 characters (32 bytes hex)
		const setExCall = redisClient.setEx.mock.calls[0]
		const redisKey = setExCall[0] as string
		const token = redisKey.replace('password_recovery:', '')

		expect(token).toHaveLength(64)
		expect(token).toMatch(/^[0-9a-f]{64}$/) // Valid hex string
	})

	it('should log token generation details', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordRecoveryRequestUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: null
		}

		userRepo.findByEmail.mockResolvedValue(mockUser)
		redisClient.setEx.mockResolvedValue('OK')
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ email: 'user@example.com', organization: 'test-org' })
		await useCase.run(job)

		// Verify logging
		expect(logger.info).toHaveBeenCalledWith(
			{ email: 'user@example.com', organization: 'test-org' },
			'Password recovery request initiated'
		)

		expect(logger.info).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-123' }),
			'Recovery token generated and stored'
		)

		expect(logger.info).toHaveBeenCalledWith(
			{ email: 'user@example.com' },
			'Password reset email job dispatched successfully'
		)
	})
})
