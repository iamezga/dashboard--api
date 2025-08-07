import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/services/dependencyContainer'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { ExampleGetJobInterface } from './ExampleGetJobInterface'

/**
 * Example use case to define the standard structure that each new case of use must follow
 *
 */
export class ExampleGetUseCase extends UseCase<ExampleGetJobInterface> {
	constructor(container: DependencyContainer) {
		super(container)
	}

	async run(job: ExampleGetJobInterface): Promise<UseCaseResponseInterface> {
		// ...Some business logic
		const data = job.getData()
		this.container.logger.info(data)

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
