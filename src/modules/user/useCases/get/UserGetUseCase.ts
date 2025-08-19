import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/services/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { UserGetJobInterface } from './UserGetJobInterface'

/**
 * UseCase Example to define the standard structure that each new useCase of use must follo
 */
export class UserGetUseCase extends UseCase<UserGetJobInterface> {
	constructor(container: DependencyContainer) {
		super(container)
	}

	async run(job: UserGetJobInterface): Promise<UseCaseResponseInterface> {
		// ...Some business logic
		const data = job.getData()
		this.container.logger.info(data)
		const user = await this.container.repositories.user.findById(data.id)

		return {
			data: user || {},
			metadata: {
				attempts: job.getAttempts()
			}
		}
	}
}
