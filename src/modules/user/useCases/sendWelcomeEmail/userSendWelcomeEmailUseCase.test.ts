import { Mock, vi } from 'vitest'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { UserSendWelcomeEmailUseCase } from './UserSendWelcomeEmailUseCase'

describe('UserSendWelcomeEmailUseCase', () => {
	let useCase: UserSendWelcomeEmailUseCase
	let container: DependencyContainer
	let mockJob: any
	let mockEmailService: any
	let mockLogger: any

	beforeEach(() => {
		mockLogger = {
			info: vi.fn(),
			error: vi.fn(),
			warn: vi.fn(),
			debug: vi.fn()
		}

		mockEmailService = {
			send: vi.fn().mockResolvedValue(undefined)
		}

		mockJob = {
			getData: vi.fn(),
			logger: mockLogger,
			context: {
				requestId: 'test-request-id',
				organizationId: 'org-123',
				userId: 'user-456'
			}
		}

		container = {
			config: {
				get: vi.fn().mockReturnValue('MyApp')
			} as any,
			services: {
				emailService: mockEmailService
			} as any,
			libs: {} as any,
			repositoryManager: {} as any,
			validator: {} as any,
			logger: mockLogger,
			databaseManager: {} as any,
			utils: {} as any
		} as any

		useCase = new UserSendWelcomeEmailUseCase(container)
	})

	describe('run', () => {
		it('should send welcome email with correct data', async () => {
			mockJob.getData.mockReturnValue({
				email: 'newuser@example.com',
				name: 'New User'
			})

			const result = await useCase.run(mockJob)

			expect(mockEmailService.send).toHaveBeenCalledWith({
				to: 'newuser@example.com',
				templateId: 'user-welcome',
				templateData: {
					name: 'New User',
					appName: 'MyApp'
				}
			})
			expect(result.data).toEqual({ sent: true })
			expect(result.metadata?.message).toBe(
				'Welcome email dispatched to newuser@example.com.'
			)
		})

		it('should log email sending action', async () => {
			mockJob.getData.mockReturnValue({
				email: 'test@example.com',
				name: 'Test User'
			})

			await useCase.run(mockJob)

			expect(mockLogger.info).toHaveBeenCalledWith(
				'Sending welcome email to test@example.com'
			)
		})

		it('should handle different user data', async () => {
			mockJob.getData.mockReturnValue({
				email: 'jane@example.com',
				name: 'Jane Smith'
			})

			await useCase.run(mockJob)

			expect(mockEmailService.send).toHaveBeenCalledWith({
				to: 'jane@example.com',
				templateId: 'user-welcome',
				templateData: {
					name: 'Jane Smith',
					appName: 'MyApp'
				}
			})
		})

		it('should use appName from config', async () => {
			;(container.config.get as Mock).mockReturnValue('CustomAppName')
			mockJob.getData.mockReturnValue({
				email: 'user@example.com',
				name: 'User'
			})

			await useCase.run(mockJob)

			expect(container.config.get).toHaveBeenCalledWith('appName')
			expect(mockEmailService.send).toHaveBeenCalledWith(
				expect.objectContaining({
					templateData: expect.objectContaining({
						appName: 'CustomAppName'
					})
				})
			)
		})

		it('should propagate email service errors', async () => {
			const emailError = new Error('SMTP connection failed')
			mockEmailService.send.mockRejectedValue(emailError)
			mockJob.getData.mockReturnValue({
				email: 'fail@example.com',
				name: 'Fail User'
			})

			await expect(useCase.run(mockJob)).rejects.toThrow(
				'SMTP connection failed'
			)
		})

		it('should handle emails with special characters', async () => {
			mockJob.getData.mockReturnValue({
				email: 'user+test@example.com',
				name: "O'Brien"
			})

			const result = await useCase.run(mockJob)

			expect(mockEmailService.send).toHaveBeenCalledWith({
				to: 'user+test@example.com',
				templateId: 'user-welcome',
				templateData: {
					name: "O'Brien",
					appName: 'MyApp'
				}
			})
			expect(result.data).toEqual({ sent: true })
		})

		it('should return success result after sending email', async () => {
			mockJob.getData.mockReturnValue({
				email: 'success@example.com',
				name: 'Success User'
			})

			const result = await useCase.run(mockJob)

			expect(result).toEqual({
				data: { sent: true },
				metadata: {
					message: 'Welcome email dispatched to success@example.com.'
				}
			})
		})
	})
})
