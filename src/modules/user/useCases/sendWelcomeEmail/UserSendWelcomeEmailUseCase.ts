import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { UserSendWelcomeEmailJobInterface } from './UserSendWelcomeEmailJobInterface'

export class UserSendWelcomeEmailUseCase extends UseCase<UserSendWelcomeEmailJobInterface> {
	// This is an internal use case and does not require external permissions.

	constructor(container: DependencyContainer) {
		super(container)
	}

	async run(
		job: UserSendWelcomeEmailJobInterface
	): Promise<UseCaseResponseInterface> {
		const { email, name } = job.getData()
		const appName = this.container.config.get('appName')

		job.logger.info(`Sending welcome email to ${email}`)
		await this.container.services.emailService.send({
			to: email,
			templateId: 'user-welcome',
			templateData: { name, appName }
		})

		return {
			data: { sent: true },
			metadata: { message: `Welcome email dispatched to ${email}.` }
		}
	}
}
