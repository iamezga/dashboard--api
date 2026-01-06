import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { randomBytes } from 'crypto'
import { AuthPasswordRecoveryRequestJobInterface } from './AuthPasswordRecoveryRequestJobInterface'

/**
 * @class AuthPasswordRecoveryRequestUseCase
 * @description Handles password recovery request by generating a secure token
 * and sending recovery email to the user.
 *
 * Use Case Flow:
 * 1. Validate email format
 * 2. Check if user exists and is active
 * 3. Generate secure recovery token
 * 4. Store token in Redis with expiration (15 minutes)
 * 5. Send recovery email with token link
 * 6. Return success response (always, even if user doesn't exist - security)
 *
 * Security Notes:
 * - Always returns success to prevent email enumeration
 * - Token expires after 15 minutes
 * - Token can only be used once
 * - Rate limiting should be applied at endpoint level
 *
 * @permission Public (no authentication required)
 */
export class AuthPasswordRecoveryRequestUseCase extends UseCase<AuthPasswordRecoveryRequestJobInterface> {
	static readonly permission: string | undefined = undefined // Public use case

	// Recovery token configuration
	private static readonly TOKEN_EXPIRY_SECONDS = 900 // 15 minutes
	private static readonly TOKEN_LENGTH_BYTES = 32 // 256 bits
	private static readonly REDIS_KEY_PREFIX = 'password_recovery:'

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
			const redisClient = this.container.databaseManager.get('redis')

			// Resolve organization slug to organizationId
			const organizationRecord = await organizationRepository.findBySlug(
				organization
			)

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

			// Find user by email and organization
			const user = await userRepository.findByEmail(
				email,
				organizationRecord.id
			)

			// If user exists, is active, and not deleted, proceed with recovery
			if (user && user.active && !user.deletedAt) {
				// Generate secure random token
				const token = randomBytes(
					AuthPasswordRecoveryRequestUseCase.TOKEN_LENGTH_BYTES
				).toString('hex')

				// Store token in Redis with user ID
				const redisKey = `${AuthPasswordRecoveryRequestUseCase.REDIS_KEY_PREFIX}${token}`
				await redisClient.setEx(
					redisKey,
					AuthPasswordRecoveryRequestUseCase.TOKEN_EXPIRY_SECONDS,
					user.id
				)

				job.logger.info(
					{ userId: user.id, tokenLength: token.length },
					'Recovery token generated and stored'
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
					{ email, userExists: !!user, userActive: user?.active },
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
