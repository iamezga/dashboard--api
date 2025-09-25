import { UseCase } from '@/lib/UseCase'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'

export class UserSendWelcomeEmailUseCase extends UseCase<JobInterface> {
	// This is an internal use case and does not require external permissions.
	async run(job: JobInterface): Promise<UseCaseResponseInterface> {
		const { email, name } = job.getData()
		job.logger.info(`Simulating sending welcome email to ${email} (${name})`)

		// TODO: Implement actual email sending logic using an email service.
		// Simulating a 2-second task.
		await new Promise(resolve => setTimeout(resolve, 2000))

		job.logger.info(`Welcome email sent to ${email}`)

		return {
			data: { sent: true },
			metadata: { message: 'Welcome email sent.' }
		}
	}
}
