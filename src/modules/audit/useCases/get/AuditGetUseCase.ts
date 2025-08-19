import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/services/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuditGetJobInterface } from './AuditGetJobInterface'

/**
 * Example use case to define the standard structure that each new case of use must follow
 *
 */
export class AuditGetUseCase extends UseCase<AuditGetJobInterface> {
	constructor(container: DependencyContainer) {
		super(container)
	}

	async run(job: AuditGetJobInterface): Promise<UseCaseResponseInterface> {
		// ...Some business logic
		const data = job.getData()
		this.container.logger.info(data)
		const user = await this.container.repositories.user.findById('1')
		console.log(user)

		return {
			data: {
				message: `Data received for foo: ${data.foo}, bar: ${data.bar}`
			},
			metadata: {
				attempts: job.getAttempts()
			}
		}
	}
}
