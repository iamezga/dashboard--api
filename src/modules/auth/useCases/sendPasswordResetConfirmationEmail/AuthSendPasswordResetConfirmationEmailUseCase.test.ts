import type { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthSendPasswordResetConfirmationEmailUseCase } from './AuthSendPasswordResetConfirmationEmailUseCase'

describe('AuthSendPasswordResetConfirmationEmailUseCase', () => {
	let useCase: AuthSendPasswordResetConfirmationEmailUseCase
	let mockContainer: DependencyContainer
	let mockEmailService: {
		send: jest.Mock
	}
	let mockConfig: {
		get: jest.Mock
	}
	let mockJob: any
	let mockLogger: any

	beforeEach(() => {
		mockLogger = {
			info: jest.fn(),
			error: jest.fn(),
			warn: jest.fn(),
			debug: jest.fn()
		}

		mockEmailService = {
			send: jest.fn().mockResolvedValue(undefined)
		}

		mockConfig = {
			get: jest.fn((key: string) => {
				const configMap: Record<string, string> = {
					appName: 'TestApp',
					'email.supportEmail': '[email protected]'
				}
				return configMap[key]
			})
		}

		mockJob = {
			getData: jest.fn(),
			logger: mockLogger
		}

		mockContainer = {
			services: {
				emailService: mockEmailService
			},
			config: mockConfig
		} as unknown as DependencyContainer

		useCase = new AuthSendPasswordResetConfirmationEmailUseCase(mockContainer)
	})

	describe('run', () => {
		it('should send password reset confirmation email with correct template data', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'John Doe'
			})

			const result = await useCase.run(mockJob)

			expect(mockEmailService.send).toHaveBeenCalledTimes(1)
			expect(mockEmailService.send).toHaveBeenCalledWith({
				to: '[email protected]',
				templateId: 'password-reset-confirmation',
				templateData: {
					name: 'John Doe',
					appName: 'TestApp',
					supportEmail: '[email protected]'
				}
			})

			expect(result).toEqual({
				data: {
					sent: true
				},
				metadata: {
					message:
						'Password reset confirmation email dispatched to [email protected].'
				}
			})
		})

		it('should handle email service errors', async () => {
			const emailError = new Error('SMTP server unavailable')
			mockEmailService.send.mockRejectedValue(emailError)

			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Jane Smith'
			})

			await expect(useCase.run(mockJob)).rejects.toThrow(
				'SMTP server unavailable'
			)

			expect(mockEmailService.send).toHaveBeenCalledTimes(1)
		})

		it('should retrieve config values correctly', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Test User'
			})

			await useCase.run(mockJob)

			expect(mockConfig.get).toHaveBeenCalledWith('appName')
			expect(mockConfig.get).toHaveBeenCalledWith('email.supportEmail')
		})

		it('should pass email and name to template data', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Another User'
			})

			await useCase.run(mockJob)

			const sendCall = mockEmailService.send.mock.calls[0][0]
			expect(sendCall.to).toBe('[email protected]')
			expect(sendCall.templateData.name).toBe('Another User')
		})

		it('should use password-reset-confirmation template', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Template Test'
			})

			await useCase.run(mockJob)

			const sendCall = mockEmailService.send.mock.calls[0][0]
			expect(sendCall.templateId).toBe('password-reset-confirmation')
		})
	})
})
