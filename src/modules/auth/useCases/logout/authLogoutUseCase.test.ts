import { Logger } from 'pino'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthLogoutJobInterface } from './AuthLogoutJobInterface'
import { AuthLogoutUseCase } from './AuthLogoutUseCase'

describe('AuthLogoutUseCase', () => {
	const sessionRepository = {
		deleteSession: jest.fn()
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
					if (name === 'session') return sessionRepository
					throw new Error(`Repo ${name} not mocked`)
				}
			}
		} as unknown as DependencyContainer)

	const makeJob = (userId: string, sessionId: string): AuthLogoutJobInterface =>
		({
			getData: () => ({}),
			getUser: () => ({ id: userId }),
			getMeta: () => ({ sessionId }),
			logger
		} as unknown as AuthLogoutJobInterface)

	beforeEach(() => {
		jest.clearAllMocks()
	})

	it('should have auth.logout permission', () => {
		expect(AuthLogoutUseCase.permission).toBe('auth.logout')
	})

	it('should return permission validation data', async () => {
		const mockJob = {
			getUser: () => ({ permissions: {} }),
			getMeta: () => ({})
		} as any

		const result = await AuthLogoutUseCase.getPermissionValidationData(
			mockJob,
			{} as any
		)

		expect(result).toHaveProperty('data')
		expect(result).toHaveProperty('schema')
	})

	it('should successfully logout and delete session', async () => {
		const container = makeContainer()
		const useCase = new AuthLogoutUseCase(container)

		sessionRepository.deleteSession.mockResolvedValue(true)

		const job = makeJob('user-123', 'session-abc')
		const result = await useCase.run(job)

		// Verify session was deleted
		expect(sessionRepository.deleteSession).toHaveBeenCalledWith('session-abc')

		// Verify response
		expect(result.data.message).toBe('Logout successful')
		expect(result.metadata).toHaveProperty('loggedOutAt')
		expect(result.metadata?.sessionId).toBe('session-abc')

		// Verify logging
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123', sessionId: 'session-abc' },
			'Processing logout request'
		)
		expect(logger.info).toHaveBeenCalledWith(
			{ userId: 'user-123', sessionId: 'session-abc' },
			'Session deleted successfully'
		)
	})

	it('should handle already expired or non-existent session gracefully', async () => {
		const container = makeContainer()
		const useCase = new AuthLogoutUseCase(container)

		sessionRepository.deleteSession.mockResolvedValue(false)

		const job = makeJob('user-456', 'session-xyz')
		const result = await useCase.run(job)

		// Verify session deletion was attempted
		expect(sessionRepository.deleteSession).toHaveBeenCalledWith('session-xyz')

		// Should still return success
		expect(result.data.message).toBe('Logout successful')
		expect(result.metadata?.sessionId).toBe('session-xyz')

		// Verify warning logged
		expect(logger.warn).toHaveBeenCalledWith(
			{ userId: 'user-456', sessionId: 'session-xyz' },
			'Session not found or already expired'
		)
	})

	it('should throw error if sessionId is missing', async () => {
		const container = makeContainer()
		const useCase = new AuthLogoutUseCase(container)

		const jobWithoutSession = {
			getData: () => ({}),
			getUser: () => ({ id: 'user-789' }),
			getMeta: () => ({}), // No sessionId
			logger
		} as unknown as AuthLogoutJobInterface

		await expect(useCase.run(jobWithoutSession)).rejects.toThrow(
			'Session information not found'
		)

		expect(logger.error).toHaveBeenCalledWith(
			{ userId: 'user-789' },
			'Logout attempted without sessionId'
		)
	})

	it('should log all logout steps', async () => {
		const container = makeContainer()
		const useCase = new AuthLogoutUseCase(container)

		sessionRepository.deleteSession.mockResolvedValue(true)

		const job = makeJob('user-999', 'session-test')
		await useCase.run(job)

		expect(logger.info).toHaveBeenCalledTimes(2)
		expect(logger.info).toHaveBeenNthCalledWith(
			1,
			{ userId: 'user-999', sessionId: 'session-test' },
			'Processing logout request'
		)
		expect(logger.info).toHaveBeenNthCalledWith(
			2,
			{ userId: 'user-999', sessionId: 'session-test' },
			'Session deleted successfully'
		)
	})
})
