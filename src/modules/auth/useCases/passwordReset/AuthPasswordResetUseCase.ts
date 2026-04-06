import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { PasswordRecoveryTokenRepositoryInterface } from '@/modules/auth/entities/PasswordRecoveryTokenRepositoryInterface'
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
 * 1. Validate token and new password
 * 2. Verify token exists and get associated user ID
 * 3. Check user is active and not deleted
 * 4. Hash new password and update user record
 * 5. Delete used token (enforce one-time use)
 * 6. Invalidate all user sessions (force re-login)
 * 7. Dispatch confirmation email to background queue
 * 8. Return success message
 *
 * Security Notes:
 * - Token is one-time use and securely generated
 * - All user sessions are invalidated after password reset
 * - Confirmation email is sent to user for security awareness
 * - Logs important events for monitoring and auditing
 *
 *
 * @permission Public (no authentication required)
 */
export class AuthPasswordResetUseCase extends UseCase<AuthPasswordResetJobInterface> {
	static readonly permission: string | undefined = undefined // Public use case

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

		// Verify token and get user ID
		const passwordRecoveryTokenRepository: PasswordRecoveryTokenRepositoryInterface =
			this.container.repositoryManager.get('passwordRecoveryToken')
		const userId =
			await passwordRecoveryTokenRepository.verifyAndGetUserId(token)

		if (!userId) {
			job.logger.warn(
				{ token: token.substring(0, 10) },
				'Invalid or expired recovery token'
			)
			throw new BadRequestError('Invalid or expired recovery token', [
				{
					field: 'token',
					message: 'The recovery token is invalid or has expired',
					type: 'invalidToken'
				}
			])
		}

		// Get user repository
		const userRepository = this.container.repositoryManager.get('user')
		const sessionRepository = this.container.repositoryManager.get('session')

		// Verify user still exists and is active
		const user = await userRepository.findById(userId)

		if (!user || user.status != 'active' || user.deletedAt) {
			job.logger.warn(
				{ userId, userStatus: user?.status },
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
		// Delete recovery token (enforces one-time use)
		await passwordRecoveryTokenRepository.deleteToken(token)

		job.logger.info({ userId }, 'Recovery token deleted')
		// Delete all user recovery tokens (security: invalidate other recovery requests)
		await passwordRecoveryTokenRepository.deleteAllUserTokens(userId)

		// Invalidate all user sessions (force re-login for security)
		await sessionRepository.deleteAllUserSessions(userId)

		// Dispatch confirmation email to background queue
		job.setData({
			email: user.email,
			name: user.name
		})

		await this.container.services.jobService.dispatchUseCase(
			'emails',
			'AuthSendPasswordResetConfirmationEmailUseCase',
			job,
			{
				priority: 8, // High priority for confirmation emails
				attempts: 5 // More attempts for critical emails
			}
		)

		job.logger.info(
			{ userId },
			'Password reset confirmation email job dispatched successfully'
		)

		return {
			data: {
				message:
					'Password has been reset successfully. Please log in with your new password.'
			},
			metadata: {
				resetAt: new Date().toISOString(),
				sessionsInvalidated: true
			}
		}
	}
}
