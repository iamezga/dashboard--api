import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { UserSendWelcomeEmailJobInterface } from './UserSendWelcomeEmailJobInterface'

/**
 * @class UserSendWelcomeEmailUseCase
 * @extends UseCase
 * @description Handles sending welcome emails to newly registered users.
 * This is a background job use case that is typically dispatched after
 * successful user registration.
 *
 * Flow:
 * 1. Extract user email and name from job data
 * 2. Send welcome email using EmailService with template
 * 3. Log the operation
 * 4. Return success confirmation
 *
 * This is an internal use case (no external permission required) as it's
 * triggered by other use cases, not directly by API endpoints.
 */
export class UserSendWelcomeEmailUseCase extends UseCase<UserSendWelcomeEmailJobInterface> {
	// This is an internal use case and does not require external permissions.

	/**
	 * @param {DependencyContainer} container - Application dependency container
	 */
	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Executes the welcome email sending logic.
	 *
	 * @param {UserSendWelcomeEmailJobInterface} job - Job containing user email and name
	 * @returns {Promise<UseCaseResponseInterface>} Success confirmation with metadata
	 */
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
