import { BadRequestError, NotFoundError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { User } from '../../entities/User'
import { UserUpdateSelfUseCase } from './UserUpdateSelfUseCase'

describe('UserUpdateSelfUseCase', () => {
	let container: DependencyContainer
	let useCase: UserUpdateSelfUseCase
	let mockUser: User
	let mockJob: any
	let mockUserRepository: any
	let mockLogger: any

	const createMockJob = (data: any) =>
		({
			getId: jest.fn().mockReturnValue('job-123'),
			getData: jest.fn().mockReturnValue(data),
			getUser: jest.fn().mockReturnValue({
				id: 'user-123',
				organizationId: 'org-123',
				roleId: 'role-user',
				email: 'user@example.com',
				permissions: { 'user.update.self': true }
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

		container = {
			repositoryManager: {
				get: jest.fn((name: string) => {
					if (name === 'user') return mockUserRepository
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

		useCase = new UserUpdateSelfUseCase(container)

		mockUser = {
			id: 'user-123',
			organizationId: 'org-123',
			roleId: 'role-user',
			email: 'user@example.com',
			name: 'John',
			surname: 'Doe',
			active: true,
			lastLogin: null,
			config: {},
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		}

		mockJob = createMockJob({
			name: 'Updated Name'
		})
	})

	describe('getPermissionValidationData', () => {
		it('should return permission validation data', async () => {
			const result = await UserUpdateSelfUseCase.getPermissionValidationData(
				mockJob,
				container
			)

			expect(UserUpdateSelfUseCase.permission).toBe('user.update.self')
			expect(result.data.permission).toBe('user.update.self')
			expect(result.schema.permission).toEqual({
				type: 'enum',
				values: ['user.update.self']
			})
		})
	})

	describe('run', () => {
		it('should update own name', async () => {
			const updatedUser = { ...mockUser, name: 'Updated Name' }

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.update.mockResolvedValue(updatedUser)

			const result = await useCase.run(mockJob)

			expect(result.data).toEqual(updatedUser)
			expect(result.metadata?.message).toBe('Profile updated successfully.')
			expect(mockUserRepository.update).toHaveBeenCalledWith(
				'user-123',
				{ name: 'Updated Name' },
				'org-123'
			)
		})

		it('should throw NotFoundError if user does not exist', async () => {
			mockUserRepository.findById.mockResolvedValue(null)

			await expect(useCase.run(mockJob)).rejects.toThrow(NotFoundError)
			await expect(useCase.run(mockJob)).rejects.toThrow(
				'User profile not found'
			)
		})

		it('should update own surname', async () => {
			const jobWithSurname = createMockJob({
				surname: 'Updated Surname'
			})

			const updatedUser = { ...mockUser, surname: 'Updated Surname' }

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.update.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithSurname)

			expect(result.data.surname).toBe('Updated Surname')
			expect(mockUserRepository.update).toHaveBeenCalledWith(
				'user-123',
				{ surname: 'Updated Surname' },
				'org-123'
			)
		})

		it('should update own email if unique', async () => {
			const jobWithEmail = createMockJob({
				email: 'newemail@example.com'
			})

			const updatedUser = { ...mockUser, email: 'newemail@example.com' }

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.findByEmail.mockResolvedValue(null)
			mockUserRepository.update.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithEmail)

			expect(result.data.email).toBe('newemail@example.com')
			expect(mockUserRepository.findByEmail).toHaveBeenCalledWith(
				'newemail@example.com',
				'org-123'
			)
		})

		it('should throw BadRequestError if email already exists', async () => {
			const jobWithEmail = createMockJob({
				email: 'existing@example.com'
			})

			const existingEmailUser = {
				...mockUser,
				id: 'other-user',
				email: 'existing@example.com'
			}

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.findByEmail.mockResolvedValue(existingEmailUser)

			await expect(useCase.run(jobWithEmail)).rejects.toThrow(BadRequestError)
			await expect(useCase.run(jobWithEmail)).rejects.toThrow(
				'A user with this email already exists'
			)
		})

		it('should not check email uniqueness if email is not changed', async () => {
			const jobWithEmail = createMockJob({
				email: 'user@example.com' // Same as mockUser.email
			})

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.update.mockResolvedValue(mockUser)

			await useCase.run(jobWithEmail)

			expect(mockUserRepository.findByEmail).not.toHaveBeenCalled()
			expect(mockUserRepository.update).not.toHaveBeenCalled()
		})

		it('should update own config using deep merge', async () => {
			const userWithConfig = {
				...mockUser,
				config: {
					user: {
						preferences: {
							ui: { theme: 'light', language: 'en' }
						}
					},
					admin: {
						limits: { maxStorageMB: 500 }
					}
				}
			}

			const jobWithConfig = createMockJob({
				config: {
					user: {
						preferences: {
							ui: { theme: 'dark', language: 'es' }
						}
					}
				}
			})

			const expectedConfig = {
				user: {
					preferences: {
						ui: { theme: 'dark', language: 'es' }
					}
				},
				admin: {
					limits: { maxStorageMB: 500 }
				}
			}

			const updatedUser = {
				...userWithConfig,
				config: expectedConfig
			}

			mockUserRepository.findById.mockResolvedValue(userWithConfig)
			mockUserRepository.update.mockResolvedValue(updatedUser)

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
							notifications: { email: true, push: false, desktop: true },
							dashboard: { layout: 'grid' }
						}
					},
					admin: {
						limits: { maxStorageMB: 1000, maxUploadsPerDay: 50 },
						features: { betaFeatures: false, exportData: true }
					}
				}
			}

			const jobWithPartialConfig = createMockJob({
				config: {
					user: {
						preferences: {
							ui: { theme: 'dark' },
							notifications: { push: true }
						}
					}
				}
			})

			const expectedNestedConfig = {
				user: {
					preferences: {
						ui: {
							theme: 'dark',
							fontSize: 14,
							dateFormat: 'DD/MM/YYYY'
						},
						notifications: {
							email: true,
							push: true,
							desktop: true
						},
						dashboard: { layout: 'grid' }
					}
				},
				admin: {
					limits: { maxStorageMB: 1000, maxUploadsPerDay: 50 },
					features: { betaFeatures: false, exportData: true }
				}
			}

			const updatedUser = {
				...userWithNestedConfig,
				config: expectedNestedConfig
			}

			mockUserRepository.findById.mockResolvedValue(userWithNestedConfig)
			mockUserRepository.update.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobWithPartialConfig)

			expect(result.data.config).toEqual(expectedNestedConfig)
			const updateCall = mockUserRepository.update.mock.calls[0]
			expect(updateCall[1].config).toEqual(expectedNestedConfig)
		})

		it('should update multiple fields at once', async () => {
			const jobMultipleFields = createMockJob({
				name: 'New Name',
				surname: 'New Surname',
				email: 'newemail@example.com',
				config: { theme: 'dark' }
			})

			const updatedUser = {
				...mockUser,
				name: 'New Name',
				surname: 'New Surname',
				email: 'newemail@example.com',
				config: { theme: 'dark' }
			}

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.findByEmail.mockResolvedValue(null)
			mockUserRepository.update.mockResolvedValue(updatedUser)

			const result = await useCase.run(jobMultipleFields)

			expect(result.data).toEqual(updatedUser)
			expect(mockUserRepository.update).toHaveBeenCalledWith(
				'user-123',
				{
					name: 'New Name',
					surname: 'New Surname',
					email: 'newemail@example.com',
					config: { theme: 'dark' }
				},
				'org-123'
			)
		})

		it('should return existing user if no changes provided', async () => {
			const jobNoChanges = createMockJob({})

			mockUserRepository.findById.mockResolvedValue(mockUser)

			const result = await useCase.run(jobNoChanges)

			expect(result.data).toEqual(mockUser)
			expect(result.metadata?.message).toBe('No changes to update.')
			expect(mockUserRepository.update).not.toHaveBeenCalled()
		})

		it('should log successful update', async () => {
			const updatedUser = { ...mockUser, name: 'Updated Name' }

			mockUserRepository.findById.mockResolvedValue(mockUser)
			mockUserRepository.update.mockResolvedValue(updatedUser)

			await useCase.run(mockJob)

			expect(mockJob.logger.info).toHaveBeenCalledWith(
				'User user@example.com updated own profile successfully.'
			)
		})
	})
})
