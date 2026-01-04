import { Logger } from 'pino'
import { BadRequestError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthPasswordResetJobInterface } from './AuthPasswordResetJobInterface'
import { AuthPasswordResetUseCase } from './AuthPasswordResetUseCase'

describe('AuthPasswordResetUseCase', () => {
	const userRepo = {
		findById: jest.fn(),
		update: jest.fn()
	}

	const redisClient = {
		get: jest.fn(),
		del: jest.fn(),
		keys: jest.fn()
	}

	const argon2 = {
		hash: jest.fn()
	}

	const emailService = {
		send: jest.fn(),
		sendHtml: jest.fn()
	}

	const config = {
		get: jest.fn((key: string) => {
			if (key === 'appName') return 'TestApp'
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
				emailService
			},
			libs: {
				argon2
			},
			config
		} as unknown as DependencyContainer)

	const makeJob = (data: any): AuthPasswordResetJobInterface =>
		({
			getData: () => data,
			logger
		} as unknown as AuthPasswordResetJobInterface)

	const validToken = 'a'.repeat(64)
	const newPassword = 'newSecurePassword123'

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should have undefined permission for public use case', () => {
		expect(AuthPasswordResetUseCase.permission).toBeUndefined()
	})

	it('should return empty permission validation data', async () => {
		const result = await AuthPasswordResetUseCase.getPermissionValidationData(
			{} as any,
			{} as any
		)

		expect(result).toEqual({
			data: {},
			schema: {}
		})
	})

	it('should reset password successfully', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: null
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)
		argon2.hash.mockResolvedValue('hashed-password')
		userRepo.update.mockResolvedValue(mockUser)
		redisClient.del.mockResolvedValue(1)
		redisClient.keys.mockResolvedValue([
			'session:abc:user-123',
			'session:xyz:user-123'
		])
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		const result = await useCase.run(job)

		// Verify token lookup
		expect(redisClient.get).toHaveBeenCalledWith(
			`password_recovery:${validToken}`
		)

		// Verify user lookup
		expect(userRepo.findById).toHaveBeenCalledWith('user-123')

		// Verify password hashing
		expect(argon2.hash).toHaveBeenCalledWith(newPassword)

		// Verify password update
		expect(userRepo.update).toHaveBeenCalledWith('user-123', {
			passwordHash: 'hashed-password'
		})

		// Verify token deletion
		expect(redisClient.del).toHaveBeenCalledWith(
			`password_recovery:${validToken}`
		)

		// Verify sessions invalidated
		expect(redisClient.keys).toHaveBeenCalledWith('session:*:user-123')
		expect(redisClient.del).toHaveBeenCalledWith([
			'session:abc:user-123',
			'session:xyz:user-123'
		])

		// Verify confirmation email
		expect(emailService.send).toHaveBeenCalledWith({
			to: 'user@example.com',
			templateId: 'password-reset-confirmation',
			templateData: {
				name: 'John Doe',
				appName: 'TestApp',
				supportEmail: 'support@example.com'
			}
		})

		expect(result.data.message).toContain('reset successfully')
		expect(result.metadata).toBeDefined()
		expect(result.metadata?.sessionsInvalidated).toBe(2)
		expect(result.metadata).toHaveProperty('resetAt')
	})

	it('should throw BadRequestError for invalid token', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		redisClient.get.mockResolvedValue(null) // Token not found

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
		await expect(useCase.run(job)).rejects.toThrow('Invalid or expired')

		// Should not update password
		expect(userRepo.update).not.toHaveBeenCalled()
	})

	it('should throw BadRequestError for expired token', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		redisClient.get.mockResolvedValue(null) // Expired

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should throw BadRequestError if user not found', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(null) // User deleted

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
		await expect(useCase.run(job)).rejects.toThrow('not active')
	})

	it('should throw BadRequestError if user is inactive', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: false, // Inactive
			deletedAt: null
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should throw BadRequestError if user is deleted', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: new Date() // Deleted
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should handle case with no active sessions', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: null
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)
		argon2.hash.mockResolvedValue('hashed-password')
		userRepo.update.mockResolvedValue(mockUser)
		redisClient.del.mockResolvedValue(1)
		redisClient.keys.mockResolvedValue([]) // No sessions
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		const result = await useCase.run(job)

		// Should still succeed
		expect(result.data.message).toContain('reset successfully')
		expect(result.metadata).toBeDefined()
		expect(result.metadata?.sessionsInvalidated).toBe(0)
	})

	it('should continue if email fails to send', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: null
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)
		argon2.hash.mockResolvedValue('hashed-password')
		userRepo.update.mockResolvedValue(mockUser)
		redisClient.del.mockResolvedValue(1)
		redisClient.keys.mockResolvedValue([])
		emailService.send.mockRejectedValue(new Error('Email service down'))

		const job = makeJob({ token: validToken, password: newPassword })
		const result = await useCase.run(job)

		// Should still succeed
		expect(result.data.message).toContain('reset successfully')

		// Should log error
		expect(logger.error).toHaveBeenCalledWith(
			expect.objectContaining({ userId: 'user-123' }),
			'Failed to send confirmation email'
		)
	})

	it('should log all steps of password reset', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: null
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)
		argon2.hash.mockResolvedValue('hashed-password')
		userRepo.update.mockResolvedValue(mockUser)
		redisClient.del.mockResolvedValue(1)
		redisClient.keys.mockResolvedValue(['session:abc:user-123'])
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		await useCase.run(job)

		expect(logger.info).toHaveBeenCalledWith('Processing password reset')
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123' },
			'Password updated successfully'
		)
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123' },
			'Recovery token deleted'
		)
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123', sessionsInvalidated: 1 },
			'User sessions invalidated'
		)
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123' },
			'Password change confirmation email sent'
		)
	})

	it('should delete token after use (one-time use)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			active: true,
			deletedAt: null
		}

		redisClient.get.mockResolvedValue('user-123')
		userRepo.findById.mockResolvedValue(mockUser)
		argon2.hash.mockResolvedValue('hashed-password')
		userRepo.update.mockResolvedValue(mockUser)
		redisClient.del.mockResolvedValue(1)
		redisClient.keys.mockResolvedValue([])
		emailService.send.mockResolvedValue(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		await useCase.run(job)

		// Verify token was deleted from Redis
		expect(redisClient.del).toHaveBeenCalledWith(
			`password_recovery:${validToken}`
		)
	})
})
