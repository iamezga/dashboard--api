import { vi } from 'vitest'
import { Logger } from 'pino'
import { BadRequestError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthPasswordResetJobInterface } from './AuthPasswordResetJobInterface'
import { AuthPasswordResetUseCase } from './AuthPasswordResetUseCase'

describe('AuthPasswordResetUseCase', () => {
	const userRepo = {
		findById: vi.fn(),
		update: vi.fn()
	}

	const passwordRecoveryTokenRepo = {
		verifyAndGetUserId: vi.fn(),
		deleteToken: vi.fn(),
		deleteAllUserTokens: vi.fn()
	}

	const sessionRepo = {
		deleteAllUserSessions: vi.fn()
	}

	const argon2 = {
		hash: vi.fn()
	}

	const jobService = {
		dispatchUseCase: vi.fn().mockResolvedValue(undefined)
	}

	const config = {
		get: vi.fn((key: string) => {
			if (key === 'appName') return 'TestApp'
			if (key === 'email.supportEmail') return 'support@example.com'
			return ''
		})
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
					if (name === 'session') return sessionRepo
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			services: {
				jobService
			},
			libs: {
				argon2
			},
			config
		}) as unknown as DependencyContainer

	const makeJob = (data: any): AuthPasswordResetJobInterface =>
		({
			getData: () => data,
			setData: vi.fn((newData: any) => {
				Object.assign(data, newData)
			}),
			logger
		}) as unknown as AuthPasswordResetJobInterface

	const validToken = 'a'.repeat(64)
	const newPassword = 'newSecurePassword123'

	beforeEach(() => {
		vi.clearAllMocks()
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
			status: 'active',
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(mockUser)
		argon2.hash.mockResolvedValueOnce('hashed-password')
		userRepo.update.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.deleteToken.mockResolvedValueOnce(1)
		passwordRecoveryTokenRepo.deleteAllUserTokens.mockResolvedValueOnce(
			undefined
		)
		sessionRepo.deleteAllUserSessions.mockResolvedValueOnce(undefined)
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		const result = await useCase.run(job)

		// Verify token verification
		expect(passwordRecoveryTokenRepo.verifyAndGetUserId).toHaveBeenCalledWith(
			validToken
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
		expect(passwordRecoveryTokenRepo.deleteToken).toHaveBeenCalledWith(
			validToken
		)

		// Verify all user tokens deleted
		expect(passwordRecoveryTokenRepo.deleteAllUserTokens).toHaveBeenCalledWith(
			'user-123'
		)

		// Verify sessions invalidated
		expect(sessionRepo.deleteAllUserSessions).toHaveBeenCalledWith('user-123')

		// Verify confirmation email job dispatched
		expect(jobService.dispatchUseCase).toHaveBeenCalledWith(
			'emails',
			'AuthSendPasswordResetConfirmationEmailUseCase',
			expect.objectContaining({
				getData: expect.any(Function)
			}),
			{
				priority: 8,
				attempts: 5
			}
		)

		expect(result.data.message).toContain('reset successfully')
		expect(result.metadata).toBeDefined()
		expect(result.metadata).toHaveProperty('resetAt')
		expect(result.metadata).toHaveProperty('sessionsInvalidated')
	})

	it('should throw BadRequestError for invalid token', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(null)

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
		await expect(useCase.run(job)).rejects.toThrow('Invalid or expired')

		// Should not update password
		expect(userRepo.update).not.toHaveBeenCalled()
	})

	it('should throw BadRequestError for expired token', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(null)

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should throw BadRequestError if user not found', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(null)

		const job = makeJob({ token: validToken, password: newPassword })

		await expect(useCase.run(job)).rejects.toThrow(BadRequestError)
	})

	it('should throw BadRequestError if user is inactive', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'inactive', // Inactive
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(mockUser)

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
			status: 'active',
			deletedAt: new Date() // Deleted
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(mockUser)

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
			status: 'active',
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(mockUser)
		argon2.hash.mockResolvedValueOnce('hashed-password')
		userRepo.update.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.deleteToken.mockResolvedValueOnce(1)
		passwordRecoveryTokenRepo.deleteAllUserTokens.mockResolvedValueOnce(
			undefined
		)
		sessionRepo.deleteAllUserSessions.mockResolvedValueOnce(undefined)
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		const result = await useCase.run(job)

		// Should still succeed
		expect(result.data.message).toContain('reset successfully')
		expect(result.metadata).toBeDefined()
		expect(result.metadata).toHaveProperty('sessionsInvalidated')
	})

	it('should log all steps of password reset', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(mockUser)
		argon2.hash.mockResolvedValueOnce('hashed-password')
		userRepo.update.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.deleteToken.mockResolvedValueOnce(1)
		passwordRecoveryTokenRepo.deleteAllUserTokens.mockResolvedValueOnce(
			undefined
		)
		sessionRepo.deleteAllUserSessions.mockResolvedValueOnce(undefined)
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

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
			{ userId: 'user-123' },
			'Password reset confirmation email job dispatched successfully'
		)
	})

	it('should delete token after use (one-time use)', async () => {
		const container = makeContainer()
		const useCase = new AuthPasswordResetUseCase(container)

		const mockUser = {
			id: 'user-123',
			email: 'user@example.com',
			name: 'John Doe',
			status: 'active',
			deletedAt: null
		}

		passwordRecoveryTokenRepo.verifyAndGetUserId.mockResolvedValueOnce(
			'user-123'
		)
		userRepo.findById.mockResolvedValueOnce(mockUser)
		argon2.hash.mockResolvedValueOnce('hashed-password')
		userRepo.update.mockResolvedValueOnce(mockUser)
		passwordRecoveryTokenRepo.deleteToken.mockResolvedValueOnce(1)
		passwordRecoveryTokenRepo.deleteAllUserTokens.mockResolvedValueOnce(
			undefined
		)
		sessionRepo.deleteAllUserSessions.mockResolvedValueOnce(undefined)
		jobService.dispatchUseCase.mockResolvedValueOnce(undefined)

		const job = makeJob({ token: validToken, password: newPassword })
		await useCase.run(job)

		// Verify token was deleted
		expect(passwordRecoveryTokenRepo.deleteToken).toHaveBeenCalledWith(
			validToken
		)
	})
})
