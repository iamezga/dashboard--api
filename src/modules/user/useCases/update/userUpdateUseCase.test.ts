import {
	BadRequestError,
	ForbiddenError,
	NotFoundError
} from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { User } from '../../entities/User'
import { UserUpdateUseCase } from './UserUpdateUseCase'

describe('UserUpdateUseCase', () => {
	let container: DependencyContainer
	let useCase: UserUpdateUseCase
	let mockUser: User
	let mockRole: any
	let mockJob: any
	let mockUserRepository: any
	let mockRoleRepository: any
	let mockLogger: any

	const createMockJob = (data: any) =>
		({
			getId: jest.fn().mockReturnValue('job-123'),
			getData: jest.fn().mockReturnValue(data),
			getUser: jest.fn().mockReturnValue({
				id: 'admin-123',
				organizationId: 'org-123',
				roleId: 'role-admin',
				email: 'admin@example.com',
				permissions: { 'user.update': true }
			}),
			getAttempts: jest.fn().mockReturnValue(1),
			logger: mockLogger,
			getMeta: jest.fn().mockReturnValue({}),
			getPublicUser: jest.fn().mockReturnValue(false)
		} as any)

	beforeEach(() => {
		mockLogger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockUserRepository = {
			findById: jest.fn(),
			findByEmail: jest.fn(),
			update: jest.fn()
		}

		mockRoleRepository = {
			findById: jest.fn()
		}

		container = {
			repositoryManager: {
				get: jest.fn((name: string) => {
					if (name === 'user') return mockUserRepository
					if (name === 'role') return mockRoleRepository
					return null
				})
			} as any,
			logger: mockLogger,
			utils: {
				deepMerge: (target: any, source: any) => {
					if (!source || typeof source !== 'object') return source
					if (!target || typeof target !== 'object') return source

					const result = { ...target }
					for (const key in source) {
						if (source[key] !== undefined) {
							if (
								typeof source[key] === 'object' &&
								source[key] !== null &&
								!Array.isArray(source[key]) &&
								typeof result[key] === 'object' &&
								result[key] !== null &&
								!Array.isArray(result[key])
							) {
								result[key] = container.utils.deepMerge(
									result[key],
									source[key]
								)
							} else {
								result[key] = source[key]
							}
						}
					}
					return result
				}
			} as any
		} as any

		useCase = new UserUpdateUseCase(container)

		mockUser = {
			id: 'user-123',
			organizationId: 'org-123',
			roleId: 'role-123',
			email: 'test@example.com',
			name: 'Test',
			surname: 'User',
			active: true,
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}

		mockRole = {
			id: 'role-123',
			organizationId: 'org-123',
			name: 'User Role',
			active: true,
			scope: 'TENANT',
			config: {}
		}

		mockJob = createMockJob({
			id: 'user-123',
			active: false
		})
	})

	describe('getPermissionValidationData', () => {
		it('should return permission validation data for existing user', async () => {
			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)

			const result = await UserUpdateUseCase.getPermissionValidationData(
				mockJob,
				container
			)

			expect(UserUpdateUseCase.permission).toBe('user.update')
			expect(result.data.permission).toBe('user.update')
			expect(result.schema.permission).toEqual({
				type: 'enum',
				values: ['user.update']
			})
			expect(
				container.repositoryManager.get('user').findById
			).toHaveBeenCalledWith('user-123', 'org-123')
		})

		it('should throw NotFoundError if user does not exist', async () => {
			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(null)

			await expect(
				UserUpdateUseCase.getPermissionValidationData(mockJob, container)
			).rejects.toThrow(NotFoundError)
			await expect(
				UserUpdateUseCase.getPermissionValidationData(mockJob, container)
			).rejects.toThrow('User with ID user-123 not found')
		})
	})

	describe('run', () => {
		it('should update user active status', async () => {
			const updatedUser = { ...mockUser, active: false }

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(mockJob)

			expect(result.data).toEqual(updatedUser)
			expect(result.metadata?.message).toBe('User updated successfully.')
			expect(
				container.repositoryManager.get('user').update
			).toHaveBeenCalledWith('user-123', { active: false }, 'org-123')
		})

		it('should throw NotFoundError if user does not exist', async () => {
			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(null)

			await expect(useCase.run(mockJob)).rejects.toThrow(NotFoundError)
			await expect(useCase.run(mockJob)).rejects.toThrow(
				'User with ID user-123 not found'
			)
		})

		it('should throw ForbiddenError when trying to update own profile', async () => {
			// Create job where target user ID matches authenticated user ID
			const selfEditJob = createMockJob({
				id: 'admin-123', // Same as getUser().id
				name: 'Updated Name'
			})

			const adminUser = {
				...mockUser,
				id: 'admin-123',
				email: 'admin@example.com'
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(adminUser)

			await expect(useCase.run(selfEditJob)).rejects.toThrow(ForbiddenError)
			await expect(useCase.run(selfEditJob)).rejects.toThrow(
				'Cannot update your own profile using this endpoint'
			)

			// Verify update was never called
			expect(
				container.repositoryManager.get('user').update
			).not.toHaveBeenCalled()
		})

		it('should update user config using deep merge', async () => {
			const userWithConfig = {
				...mockUser,
				config: {
					user: {
						preferences: {
							ui: { theme: 'light', language: 'en' }
						}
					},
					admin: {
						limits: { maxStorageMB: 500, maxUploadsPerDay: 20 }
					}
				}
			}

			const jobWithConfig = createMockJob({
				id: 'user-123',
				config: {
					admin: {
						limits: { maxStorageMB: 1000 },
						features: { betaFeatures: true }
					}
				}
			})

			const expectedConfig = {
				user: {
					preferences: {
						ui: { theme: 'light', language: 'en' }
					}
				},
				admin: {
					limits: {
						maxStorageMB: 1000,
						maxUploadsPerDay: 20
					},
					features: { betaFeatures: true }
				}
			}

			const updatedUser = {
				...userWithConfig,
				config: expectedConfig
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(userWithConfig)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithConfig)

			expect(result.data.config).toEqual(expectedConfig)
			const updateCall = mockUserRepository.update.mock.calls[0]
			expect(updateCall[1].config).toEqual(expectedConfig)
		})

		it('should preserve nested config levels when doing deep merge', async () => {
			const userWithNestedConfig = {
				...mockUser,
				config: {
					user: {
						preferences: {
							ui: { theme: 'light', fontSize: 14, dateFormat: 'DD/MM/YYYY' },
							notifications: { email: true, push: false }
						}
					},
					admin: {
						limits: { maxStorageMB: 1000, maxApiCallsPerHour: 500 },
						features: { exportData: true, apiAccess: false }
					}
				}
			}

			const jobWithPartialConfig = createMockJob({
				id: 'user-123',
				config: {
					admin: {
						features: { apiAccess: true }
					}
				}
			})

			const expectedNestedConfig = {
				user: {
					preferences: {
						ui: { theme: 'light', fontSize: 14, dateFormat: 'DD/MM/YYYY' },
						notifications: { email: true, push: false }
					}
				},
				admin: {
					limits: { maxStorageMB: 1000, maxApiCallsPerHour: 500 },
					features: {
						exportData: true,
						apiAccess: true
					}
				}
			}

			const updatedUser = {
				...userWithNestedConfig,
				config: expectedNestedConfig
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(userWithNestedConfig)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithPartialConfig)

			expect(result.data.config).toEqual(expectedNestedConfig)
			const updateCall = mockUserRepository.update.mock.calls[0]
			expect(updateCall[1].config).toEqual(expectedNestedConfig)
		})

		it('should update user name and surname', async () => {
			const jobWithName = createMockJob({
				id: 'user-123',
				name: 'Updated Name',
				surname: 'Updated Surname'
			})

			const updatedUser = {
				...mockUser,
				name: 'Updated Name',
				surname: 'Updated Surname'
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithName)

			expect(result.data.name).toBe('Updated Name')
			expect(result.data.surname).toBe('Updated Surname')
			expect(
				container.repositoryManager.get('user').update
			).toHaveBeenCalledWith(
				'user-123',
				{ name: 'Updated Name', surname: 'Updated Surname' },
				'org-123'
			)
		})

		it('should update email if changed and unique', async () => {
			const jobWithEmail = createMockJob({
				id: 'user-123',
				email: 'newemail@example.com'
			})

			const updatedUser = {
				...mockUser,
				email: 'newemail@example.com'
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').findByEmail = jest
				.fn()
				.mockResolvedValue(null)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithEmail)

			expect(result.data.email).toBe('newemail@example.com')
			expect(
				container.repositoryManager.get('user').findByEmail
			).toHaveBeenCalledWith('newemail@example.com', 'org-123')
		})

		it('should throw BadRequestError if email already exists', async () => {
			const jobWithEmail = createMockJob({
				id: 'user-123',
				email: 'existing@example.com'
			})

			const existingEmailUser = {
				...mockUser,
				id: 'other-user',
				email: 'existing@example.com'
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').findByEmail = jest
				.fn()
				.mockResolvedValue(existingEmailUser)

			await expect(useCase.run(jobWithEmail)).rejects.toThrow(BadRequestError)
			await expect(useCase.run(jobWithEmail)).rejects.toThrow(
				'A user with this email already exists'
			)
		})

		it('should not check email uniqueness if email is not changed', async () => {
			const jobWithEmail = createMockJob({
				id: 'user-123',
				email: 'test@example.com' // Same as mockUser.email
			})

			const updatedUser = { ...mockUser }

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			await useCase.run(jobWithEmail)

			expect(
				container.repositoryManager.get('user').findByEmail
			).not.toHaveBeenCalled()
		})

		it('should update roleId if roleId is valid and changed', async () => {
			const newRoleId = 'role-456'
			const newRole = { ...mockRole, id: newRoleId }
			const jobWithRole = createMockJob({
				id: 'user-123',
				roleId: newRoleId
			})

			const updatedUser = { ...mockUser, roleId: newRoleId }

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('role').findById = jest
				.fn()
				.mockResolvedValue(newRole)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithRole)

			expect(result.data.roleId).toBe(newRoleId)
			expect(
				container.repositoryManager.get('role').findById
			).toHaveBeenCalledWith(newRoleId, 'org-123')
		})

		it('should throw BadRequestError if new roleId is invalid', async () => {
			const jobWithRole = createMockJob({
				id: 'user-123',
				roleId: 'invalid-role'
			})

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('role').findById = jest
				.fn()
				.mockResolvedValue(null)

			await expect(useCase.run(jobWithRole)).rejects.toThrow(BadRequestError)
			await expect(useCase.run(jobWithRole)).rejects.toThrow('Invalid Role')
		})

		it('should throw BadRequestError if new roleId is inactive', async () => {
			const inactiveRole = { ...mockRole, active: false }
			const jobWithRole = createMockJob({
				id: 'user-123',
				roleId: 'role-456'
			})

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('role').findById = jest
				.fn()
				.mockResolvedValue(inactiveRole)

			await expect(useCase.run(jobWithRole)).rejects.toThrow(BadRequestError)
			await expect(useCase.run(jobWithRole)).rejects.toThrow('Invalid Role')
		})

		it('should update multiple administrative fields at once', async () => {
			const jobMultipleFields = createMockJob({
				id: 'user-123',
				name: 'New Name',
				email: 'newemail@example.com',
				roleId: 'role-456',
				active: false,
				config: { theme: 'dark' }
			})

			const newRole = { ...mockRole, id: 'role-456' }
			const updatedUser = {
				...mockUser,
				name: 'New Name',
				email: 'newemail@example.com',
				roleId: 'role-456',
				active: false,
				config: { theme: 'dark' }
			}

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').findByEmail = jest
				.fn()
				.mockResolvedValue(null)
			container.repositoryManager.get('role').findById = jest
				.fn()
				.mockResolvedValue(newRole)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobMultipleFields)

			expect(result.data).toEqual(updatedUser)
			expect(
				container.repositoryManager.get('user').update
			).toHaveBeenCalledWith(
				'user-123',
				{
					name: 'New Name',
					email: 'newemail@example.com',
					roleId: 'role-456',
					active: false,
					config: { theme: 'dark' }
				},
				'org-123'
			)
		})

		it('should log successful update', async () => {
			const updatedUser = { ...mockUser, active: false }

			container.repositoryManager.get('user').findById = jest
				.fn()
				.mockResolvedValue(mockUser)
			container.repositoryManager.get('user').update = jest
				.fn()
				.mockResolvedValue(updatedUser)

			await useCase.run(mockJob)

			expect(mockJob.logger.info).toHaveBeenCalledWith(
				'User test@example.com updated successfully.'
			)
		})
	})
})
