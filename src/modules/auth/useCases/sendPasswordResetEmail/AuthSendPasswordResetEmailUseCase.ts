import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthSendPasswordResetEmailJobInterface } from './AuthSendPasswordResetEmailJobInterface'

/**
 * @class AuthSendPasswordResetEmailUseCase
 * @extends UseCase
 * @description Handles sending password reset emails with recovery links.
 * This is a background job use case dispatched by AuthPasswordRecoveryRequestUseCase.
 *
 * Flow:
 * 1. Extract user email, name, reset link, and expiration time from job data
 * 2. Send email using EmailService with password-reset template
 * 3. Log the operation
 * 4. Return success confirmation
 *
 * Security considerations:
 * - Token is generated and validated by AuthPasswordRecoveryRequestUseCase
 * - Email sent asynchronously to avoid timing attacks
 * - Link includes frontend URL + token for user-friendly UX
 *
 * This is an internal use case (no external permission required).
 */
export class AuthSendPasswordResetEmailUseCase extends UseCase<AuthSendPasswordResetEmailJobInterface> {
	// This is an internal use case and does not require external permissions.

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Executes the password reset email sending logic.
	 *
	 * @param {AuthSendPasswordResetEmailJobInterface} job - Job with email, name, reset link, and expiration
	 * @returns {Promise<UseCaseResponseInterface>} Success confirmation
	 */
	async run(
		job: AuthSendPasswordResetEmailJobInterface
	): Promise<UseCaseResponseInterface> {
		const { email, name, resetLink, expiresIn } = job.getData()
		const appName = this.container.config.get('appName')

		job.logger.info(`Sending password reset email to ${email}`)

		await this.container.services.emailService.send({
			to: email,
			templateId: 'password-reset-email',
			templateData: {
				name,
				appName,
				resetLink,
				expiresIn
			}
		})

		return {
			data: { sent: true },
			metadata: {
				message: `Password reset email dispatched to ${email}.`
			}
		}
	}
}
