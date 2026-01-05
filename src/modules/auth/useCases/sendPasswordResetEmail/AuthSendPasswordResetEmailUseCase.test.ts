import type { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { AuthSendPasswordResetEmailUseCase } from './AuthSendPasswordResetEmailUseCase'

describe('AuthSendPasswordResetEmailUseCase', () => {
	let useCase: AuthSendPasswordResetEmailUseCase
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

		useCase = new AuthSendPasswordResetEmailUseCase(mockContainer)
	})

	describe('run', () => {
		it('should send password reset email with correct template data', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'John Doe',
				resetLink: 'https://example.com/reset?token=abc123',
				expiresIn: '15 minutes'
			})

			const result = await useCase.run(mockJob)

			expect(mockEmailService.send).toHaveBeenCalledTimes(1)
			expect(mockEmailService.send).toHaveBeenCalledWith({
				to: '[email protected]',
				templateId: 'password-reset-email',
				templateData: {
					name: 'John Doe',
					appName: 'TestApp',
					resetLink: 'https://example.com/reset?token=abc123',
					expiresIn: '15 minutes'
				}
			})

			expect(result).toEqual({
				data: {
					sent: true
				},
				metadata: {
					message: 'Password reset email dispatched to [email protected].'
				}
			})
		})

		it('should handle email service errors', async () => {
			const emailError = new Error('SMTP connection failed')
			mockEmailService.send.mockRejectedValue(emailError)

			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Jane Smith',
				resetLink: 'https://example.com/reset?token=xyz789',
				expiresIn: '15 minutes'
			})

			await expect(useCase.run(mockJob)).rejects.toThrow(
				'SMTP connection failed'
			)

			expect(mockEmailService.send).toHaveBeenCalledTimes(1)
		})

		it('should retrieve config values correctly', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Test User',
				resetLink: 'https://example.com/reset?token=test',
				expiresIn: '30 minutes'
			})

			await useCase.run(mockJob)

			expect(mockConfig.get).toHaveBeenCalledWith('appName')
		})

		it('should pass all job payload fields to email template', async () => {
			mockJob.getData.mockReturnValue({
				email: '[email protected]',
				name: 'Another User',
				resetLink: 'https://example.com/reset?token=custom123',
				expiresIn: '60 minutes'
			})

			await useCase.run(mockJob)

			const sendCall = mockEmailService.send.mock.calls[0][0]
			expect(sendCall.templateData.name).toBe('Another User')
			expect(sendCall.templateData.resetLink).toBe(
				'https://example.com/reset?token=custom123'
			)
			expect(sendCall.templateData.expiresIn).toBe('60 minutes')
		})
	})
})
