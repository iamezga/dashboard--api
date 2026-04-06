import { BadRequestError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { PasswordRecoveryTokenRepositoryInterface } from '@/modules/auth/entities/PasswordRecoveryTokenRepositoryInterface'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthPasswordRecoveryVerifyJobInterface } from './AuthPasswordRecoveryVerifyJobInterface'

/**
 * @class AuthPasswordRecoveryVerifyUseCase
 * @description Verifies a password recovery token is valid and not expired.
 *
 * Use Case Flow:
 * 1. Validate token format
 * 2. Check if token exists in Redis
 * 3. Retrieve user ID from token
 * 4. Verify user still exists and is active
 * 5. Return success with user email (masked)
 *
 * Security Notes:
 * - Token is not deleted (can still be used for password reset)
 * - Returns minimal user information
 * - Validates user is still active
 *
 * @permission Public (no authentication required)
 */
export class AuthPasswordRecoveryVerifyUseCase extends UseCase<AuthPasswordRecoveryVerifyJobInterface> {
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
		job: AuthPasswordRecoveryVerifyJobInterface
	): Promise<
		UseCaseResponseInterface<{ valid: boolean; email?: string; name?: string }>
	> {
		const { token } = job.getData()

		job.logger.info('Verifying password recovery token')

		// Verify token via repository (abstracts Redis key management)
		const passwordRecoveryTokenRepository: PasswordRecoveryTokenRepositoryInterface =
			this.container.repositoryManager.get('passwordRecoveryToken')
		const userId =
			await passwordRecoveryTokenRepository.verifyAndGetUserId(token)

		if (!userId) {
			job.logger.warn(
				{ token: token.substring(0, 10) },
				'Invalid or expired token'
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

		if (!user || user.status !== 'active' || user.deletedAt) {
			job.logger.warn(
				{ userId, userActive: user?.status },
				'Token valid but user inactive or deleted'
			)
			throw new BadRequestError('User account is not active', [
				{
					field: 'token',
					message: 'The user account associated with this token is not active.',
					type: 'inactiveUser'
				}
			])
		}

		job.logger.info({ userId }, 'Recovery token verified successfully')

		// Mask email for privacy (show first char + domain)
		const [localPart, domain] = user.email.split('@')
		const maskedEmail = `${localPart[0]}${'*'.repeat(
			localPart.length - 1
		)}@${domain}`

		return {
			data: {
				valid: true,
				email: maskedEmail,
				name: user.name
			},
			metadata: {
				verifiedAt: new Date().toISOString()
			}
		}
	}
}
