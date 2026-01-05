import { NotFoundError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { UserGetJobInterface } from './UserGetJobInterface'
import { UserGetUseCase } from './UserGetUseCase'

describe('UserGetUseCase', () => {
	let container: DependencyContainer
	let useCase: UserGetUseCase
	let mockJob: UserGetJobInterface
	let mockUserRepository: any
	let mockLogger: any

	beforeEach(() => {
		mockLogger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockUserRepository = {
			findById: jest.fn()
		}

		container = {
			repositoryManager: {
				get: jest.fn().mockReturnValue(mockUserRepository),
				create: jest.fn(),
				getAll: jest.fn()
			} as any,
			config: {} as any,
			libs: {} as any,
			services: {} as any,
			validator: {} as any,
			logger: mockLogger,
			databaseManager: {} as any,
			utils: {} as any
		} as any

		useCase = new UserGetUseCase(container)

		mockJob = {
			getId: jest.fn().mockReturnValue('job-123'),
			getData: jest.fn().mockReturnValue({ id: 'user-456' }),
			getUser: jest
				.fn()
				.mockReturnValue({ id: 'req-user-1', organizationId: 'org-1' }),
			getMeta: jest.fn().mockReturnValue({}),
			getAttempts: jest.fn().mockReturnValue(1),
			getPublicUser: jest.fn().mockReturnValue(false),
			logger: mockLogger
		} as any
	})

	describe('static properties', () => {
		it('should have correct permission', () => {
			expect(UserGetUseCase.permission).toBe('user.get')
		})
	})

	describe('getPermissionValidationData', () => {
		it('should return permission validation data', async () => {
			const mockJobForPermission = {
				getId: jest.fn().mockReturnValue('job-123'),
				getData: jest.fn().mockReturnValue({}),
				getUser: jest.fn().mockReturnValue({
					id: 'user-1',
					organizationId: 'org-1',
					permissions: { 'user.get': true }
				}),
				getMeta: jest.fn().mockReturnValue({})
			} as any

			const result = await UserGetUseCase.getPermissionValidationData(
				mockJobForPermission,
				container
			)

			expect(result).toBeDefined()
			expect(result.schema).toBeDefined()
			expect(result.data).toBeDefined()
		})
	})

	describe('run', () => {
		it('should successfully retrieve user when found', async () => {
			const mockUser = {
				id: 'user-456',
				email: 'test@example.com',
				name: 'Test User',
				organizationId: 'org-1',
				status: 'active',
				createdAt: new Date(),
				updatedAt: new Date()
			}
			mockUserRepository.findById.mockResolvedValue(mockUser)

			const result = await useCase.run(mockJob)

			// Verify repository called with correct params
			expect(container.repositoryManager.get).toHaveBeenCalledWith('user')
			expect(mockUserRepository.findById).toHaveBeenCalledWith(
				'user-456',
				'org-1'
			)

			// Verify logging
			expect(mockLogger.info).toHaveBeenCalledWith(
				{ userId: 'user-456', organizationId: 'org-1' },
				'Fetching user by ID'
			)
			expect(mockLogger.info).toHaveBeenCalledWith(
				{ userId: 'user-456', email: 'test@example.com' },
				'User retrieved successfully'
			)

			// Verify response
			expect(result.data).toEqual(mockUser)
			expect(result.metadata).toBeDefined()
			expect(result.metadata?.retrievedAt).toBeDefined()
		})

		it('should throw NotFoundError when user does not exist', async () => {
			mockUserRepository.findById.mockResolvedValue(null)

			await expect(useCase.run(mockJob)).rejects.toThrow(NotFoundError)
			await expect(useCase.run(mockJob)).rejects.toThrow(
				'User with ID user-456 not found'
			)

			expect(mockUserRepository.findById).toHaveBeenCalledWith(
				'user-456',
				'org-1'
			)
		})

		it('should respect multi-tenancy by using requesting user organizationId', async () => {
			const differentOrgUser = {
				id: 'req-user-2',
				organizationId: 'org-999'
			}
			;(mockJob as any).getUser = jest.fn().mockReturnValue(differentOrgUser)
			mockUserRepository.findById.mockResolvedValue(null)

			await expect(useCase.run(mockJob)).rejects.toThrow(NotFoundError)

			expect(mockUserRepository.findById).toHaveBeenCalledWith(
				'user-456',
				'org-999'
			)
		})

		it('should extract id from job data correctly', async () => {
			const jobData = { id: 'user-789' }
			;(mockJob as any).getData = jest.fn().mockReturnValue(jobData)
			mockUserRepository.findById.mockResolvedValue({
				id: 'user-789',
				email: 'another@example.com',
				name: 'Another User',
				organizationId: 'org-1',
				status: 'active',
				createdAt: new Date(),
				updatedAt: new Date()
			})

			await useCase.run(mockJob)

			expect(mockJob.getData).toHaveBeenCalled()
			expect(mockUserRepository.findById).toHaveBeenCalledWith(
				'user-789',
				'org-1'
			)
		})

		it('should handle repository errors properly', async () => {
			const dbError = new Error('Database connection failed')
			mockUserRepository.findById.mockRejectedValue(dbError)

			await expect(useCase.run(mockJob)).rejects.toThrow(
				'Database connection failed'
			)

			expect(mockLogger.info).toHaveBeenCalledWith(
				{ userId: 'user-456', organizationId: 'org-1' },
				'Fetching user by ID'
			)
		})
	})
})
