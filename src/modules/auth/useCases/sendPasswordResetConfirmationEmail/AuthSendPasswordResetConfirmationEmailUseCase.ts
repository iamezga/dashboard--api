import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthSendPasswordResetConfirmationEmailJobInterface } from './AuthSendPasswordResetConfirmationEmailJobInterface'

/**
 * Use case for sending password reset confirmation email
 * This is an internal use case dispatched from AuthPasswordResetUseCase
 */
export class AuthSendPasswordResetConfirmationEmailUseCase extends UseCase<AuthSendPasswordResetConfirmationEmailJobInterface> {
	// This is an internal use case and does not require external permissions.

	constructor(container: DependencyContainer) {
		super(container)
	}

	async run(
		job: AuthSendPasswordResetConfirmationEmailJobInterface
	): Promise<UseCaseResponseInterface> {
		const { email, name } = job.getData()
		const appName = this.container.config.get('appName')
		const supportEmail = this.container.config.get('email.supportEmail')

		job.logger.info(`Sending password reset confirmation email to ${email}`)

		await this.container.services.emailService.send({
			to: email,
			templateId: 'password-reset-confirmation',
			templateData: {
				name,
				appName,
				supportEmail
			}
		})

		return {
			data: { sent: true },
			metadata: {
				message: `Password reset confirmation email dispatched to ${email}.`
			}
		}
	}
}
