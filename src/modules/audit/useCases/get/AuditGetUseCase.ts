import { NotFoundError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { Audit } from '../../entities'
import { AuditGetJobInterface } from './AuditGetJobInterface'

/**
 * @class AuditGetUseCase
 * @description Retrieves a single audit record by ID.
 *
 * Use Case Flow:
 * 1. Validate input (id required)
 * 2. Check user has 'audit.get' permission
 * 3. Retrieve audit record from repository
 * 4. Return audit record or throw NotFoundError
 *
 * @permission audit.get
 */
export class AuditGetUseCase extends UseCase<AuditGetJobInterface> {
	static readonly permission: string = 'audit.get'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `audit.get` permission check.
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		return this.buildPermissionSchema(this.permission, job)
	}

	async run(
		job: AuditGetJobInterface
	): Promise<UseCaseResponseInterface<Audit>> {
		const { id } = job.getData()

		job.logger.info({ id }, 'Retrieving audit record')

		// Get audit repository
		const auditRepository = this.container.repositoryManager.get('audit')

		// Find audit record by ID
		const audit = await auditRepository.findById(id)

		// Throw NotFoundError if audit record doesn't exist
		if (!audit) {
			throw new NotFoundError(`Audit record with ID '${id}' not found`)
		}

		job.logger.info(
			{ auditId: audit._id },
			'Audit record retrieved successfully'
		)

		return {
			data: audit,
			metadata: {
				retrievedAt: new Date().toISOString()
			}
		}
	}
}
