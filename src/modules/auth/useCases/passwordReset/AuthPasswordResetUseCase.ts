import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthPasswordResetJobInterface } from './AuthPasswordResetJobInterface'

/**
 * @class AuthPasswordResetUseCase
 * @description Resets user password using a valid recovery token.
 *
 * Use Case Flow:
 * 1. Validate token and password
 * 2. Retrieve user ID from Redis token
 * 3. Verify user exists and is active
 * 4. Hash new password
 * 5. Update user password
 * 6. Delete token from Redis (one-time use)
 * 7. Invalidate all user sessions (force re-login)
 * 8. Send confirmation email
 * 9. Return success
 *
 * Security Notes:
 * - Token is deleted after use (one-time only)
 * - All existing sessions are invalidated
 * - Password is hashed with argon2
 * - Confirmation email is sent
 *
 * @permission Public (no authentication required)
 */
export class AuthPasswordResetUseCase extends UseCase<AuthPasswordResetJobInterface> {
	static readonly permission: string | undefined = undefined // Public use case

	private static readonly REDIS_KEY_PREFIX = 'password_recovery:'
	private static readonly SESSION_KEY_PREFIX = 'session:'

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
		job: AuthPasswordResetJobInterface
	): Promise<UseCaseResponseInterface<{ message: string }>> {
		const { token, password } = job.getData()

		job.logger.info('Processing password reset')

		// Get Redis client
		const redisClient = this.container.databaseManager.get('redis')
		const redisKey = `${AuthPasswordResetUseCase.REDIS_KEY_PREFIX}${token}`

		// Check if token exists in Redis
		const userId = await redisClient.get(redisKey)

		if (!userId) {
			job.logger.warn(
				{ token: token.substring(0, 10) },
				'Invalid or expired token for password reset'
			)
			throw new BadRequestError('Invalid or expired recovery token', [
				{
					field: 'token',
					message: 'The recovery token is invalid or has expired.',
					type: 'invalidToken'
				}
			])
		}

		// Get user repository
		const userRepository = this.container.repositoryManager.get('user')

		// Verify user still exists and is active
		const user = await userRepository.findById(userId)

		if (!user || !user.active || user.deletedAt) {
			job.logger.warn(
				{ userId, userActive: user?.active },
				'Password reset attempted for inactive or deleted user'
			)
			throw new BadRequestError('User account is not active', [
				{
					field: 'token',
					message: 'The user account associated with this token is not active.',
					type: 'inactiveUser'
				}
			])
		}

		// Hash new password
		const passwordHash = await this.container.libs.argon2.hash(password)

		// Update user password
		await userRepository.update(userId, { passwordHash })

		job.logger.info({ userId }, 'Password updated successfully')

		// Delete recovery token (one-time use)
		await redisClient.del(redisKey)

		job.logger.info({ userId }, 'Recovery token deleted')

		// Invalidate all user sessions (force re-login for security)
		const sessionKeys = await redisClient.keys(
			`${AuthPasswordResetUseCase.SESSION_KEY_PREFIX}*:${userId}`
		)

		if (sessionKeys.length > 0) {
			await redisClient.del(sessionKeys)
			job.logger.info(
				{ userId, sessionsInvalidated: sessionKeys.length },
				'User sessions invalidated'
			)
		}

		// Send confirmation email
		try {
			const emailService = this.container.services.emailService
			const config = this.container.config

			await emailService.send({
				to: user.email,
				templateId: 'password-reset-confirmation',
				templateData: {
					name: user.name,
					appName: config.get('appName'),
					supportEmail: config.get('email.supportEmail')
				}
			})

			job.logger.info({ userId }, 'Password change confirmation email sent')
		} catch (emailError) {
			// Log error but don't fail the password reset
			job.logger.error(
				{ error: emailError, userId },
				'Failed to send confirmation email'
			)
		}

		return {
			data: {
				message:
					'Password has been reset successfully. Please log in with your new password.'
			},
			metadata: {
				resetAt: new Date().toISOString(),
				sessionsInvalidated: sessionKeys.length
			}
		}
	}
}
