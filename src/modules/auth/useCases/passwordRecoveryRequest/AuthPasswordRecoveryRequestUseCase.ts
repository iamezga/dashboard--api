import { UseCase } from '@/lib/UseCase'
import { PasswordRecoveryTokenRepositoryInterface } from '@/modules/auth/entities/PasswordRecoveryTokenRepositoryInterface'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthPasswordRecoveryRequestJobInterface } from './AuthPasswordRecoveryRequestJobInterface'

/**
 * @class AuthPasswordRecoveryRequestUseCase
 * @description Handles password recovery request by generating a secure token
 * and sending recovery email to the user.
 *
 * Use Case Flow:
 * 1. Validate email and organization
 * 2. Check if user exists and is active
 * 3. Generate secure token and store in Redis with expiry
 * 4. Dispatch email sending to background queue
 * 5. Return generic success message (prevent enumeration)
 *
 * Security Notes:
 * - Always return success message to prevent email enumeration
 * - Token is securely generated and stored with expiry
 * - Email sending is dispatched to background queue for reliability
 * - Logs important events for monitoring and security auditing
 *
 * @permission Public (no authentication required)
 */
export class AuthPasswordRecoveryRequestUseCase extends UseCase<AuthPasswordRecoveryRequestJobInterface> {
	static readonly permission: string | undefined = undefined // Public use case

	// Recovery token configuration
	private static readonly TOKEN_EXPIRY_SECONDS = 900 // 15 minutes

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * No permission validation needed for public use case.
	 */
	static async getPermissionValidationData(
		_job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		return {
			data: {},
			schema: {}
		}
	}

	async run(
		job: AuthPasswordRecoveryRequestJobInterface
	): Promise<UseCaseResponseInterface<{ message: string }>> {
		const { email, organization } = job.getData()

		job.logger.info(
			{ email, organization },
			'Password recovery request initiated'
		)

		try {
			// Get repositories
			const userRepository = this.container.repositoryManager.get('user')
			const organizationRepository =
				this.container.repositoryManager.get('organization')

			// Resolve organization slug to organizationId
			const organizationRecord =
				await organizationRepository.findBySlug(organization)

			// If organization doesn't exist, still return success (security: prevent enumeration)
			if (!organizationRecord) {
				job.logger.warn(
					{ organization },
					'Password recovery attempted for invalid organization'
				)
				return {
					data: {
						message:
							'If an account with that email exists, we have sent a password recovery link.'
					},
					metadata: {
						attempts: job.getAttempts()
					}
				}
			}

			// Find user by email
			const user = await userRepository.findByEmail(email)

			// If user exists, is active, and not deleted, proceed with recovery
			if (user && user.status === 'active' && !user.deletedAt) {
				// Create recovery token via repository
				const passwordRecoveryTokenRepository: PasswordRecoveryTokenRepositoryInterface =
					this.container.repositoryManager.get('passwordRecoveryToken')

				const token = await passwordRecoveryTokenRepository.createToken(
					user.id,
					AuthPasswordRecoveryRequestUseCase.TOKEN_EXPIRY_SECONDS
				)

				job.logger.info(
					{ userId: user.id, tokenLength: token.length },
					'Password recovery token created'
				)

				// Dispatch email sending to background queue
				const config = this.container.config
				const recoveryUrl = `${config.get(
					'front.url'
				)}/auth/password-reset?token=${token}`

				job.setData({
					name: user.name,
					resetLink: recoveryUrl,
					expiresIn: '15 minutes'
				})

				await this.container.services.jobService.dispatchUseCase(
					'emails',
					'AuthSendPasswordResetEmailUseCase',
					job,
					{
						priority: 10, // High priority for password reset emails
						attempts: 5 // More attempts for critical emails
					}
				)

				job.logger.info(
					{ email: user.email },
					'Password reset email job dispatched successfully'
				)
			} else {
				// User doesn't exist or is inactive
				// Don't reveal this information - log it securely
				job.logger.warn(
					{ email, userExists: !!user, userStatus: user?.status },
					'Password recovery requested for non-existent or inactive user'
				)
			}
		} catch (error) {
			// Log error but don't expose it to user (security)
			job.logger.error(
				{ error, email },
				'Error during password recovery request'
			)
		}

		// Always return success to prevent email enumeration
		return {
			data: {
				message:
					'If the email exists in our system, a recovery link has been sent.'
			},
			metadata: {
				requestedAt: new Date().toISOString()
			}
		}
	}
}
