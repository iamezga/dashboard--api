import { DependencyContainer } from '@/core/dependencyContainer'
import { UseCase } from '@/lib/UseCase'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuditGetJobInterface } from './AuditGetJobInterface'

/**
 * Example use case to define the standard structure that each new case of use must follow
 *
 */
export class AuditGetUseCase extends UseCase<AuditGetJobInterface> {
	static readonly permission: string = 'audit.get'
	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `audit.get` permission check.
	 * It dynamically generates the schema based on the permission config,
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		const permissions = job.getUser().permissions

		const data = {
			permission: AuditGetUseCase.permission
		}
		const schema = {
			permission: {
				type: 'enum',
				values: Object.keys(permissions)
			}
		}

		return { schema, data }
	}

	async run(job: AuditGetJobInterface): Promise<UseCaseResponseInterface> {
		// ...Some business logic
		const data = job.getData()
		job.logger.info(data)
		const user = await this.container.repositoryManager
			.get('user')
			.findById('1')

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
