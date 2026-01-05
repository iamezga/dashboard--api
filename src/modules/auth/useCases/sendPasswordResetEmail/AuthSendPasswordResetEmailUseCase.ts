import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthSendPasswordResetEmailJobInterface } from './AuthSendPasswordResetEmailJobInterface'

/**
 * Use case for sending password reset email
 * This is an internal use case dispatched from AuthPasswordRecoveryRequestUseCase
 */
export class AuthSendPasswordResetEmailUseCase extends UseCase<AuthSendPasswordResetEmailJobInterface> {
	// This is an internal use case and does not require external permissions.

	constructor(container: DependencyContainer) {
		super(container)
	}

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
