import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/services/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { UserGetJobInterface } from './UserGetJobInterface'

/**
 * UseCase Example to define the standard structure that each new useCase of use must follo
 */
export class UserGetUseCase extends UseCase<UserGetJobInterface> {
	static readonly permission: string = 'user.get'
	constructor(container: DependencyContainer) {
		super(container)
	}

	static async getPermissionValidationData(job: JobInterface) {
		const permissions = job.getUser().permissions

		const data = {
			permission: UserGetUseCase.permission
		}
		const schema = {
			permission: {
				type: 'enum',
				values: Object.keys(permissions)
			}
		}

		return { schema, data }
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
