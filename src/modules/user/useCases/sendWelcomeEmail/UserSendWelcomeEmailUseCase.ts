import { UseCase } from '@/lib/UseCase'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { UserSendWelcomeEmailJobInterface } from './UserSendWelcomeEmailJobInterface'

export class UserSendWelcomeEmailUseCase extends UseCase<UserSendWelcomeEmailJobInterface> {
	// This is an internal use case and does not require external permissions.
	async run(
		job: UserSendWelcomeEmailJobInterface
	): Promise<UseCaseResponseInterface> {
		const { email, name } = job.getData()

		job.logger.info(`Sending welcome email to ${email}`)
		await this.container.services.emailService.send({
			to: email,
			subject: 'Welcome to Our Platform!',
			templateId: 'user-welcome',
			data: { name }
		})

		return {
			data: { sent: true },
			metadata: { message: `Welcome email dispatched to ${email}.` }
		}
	}
}
