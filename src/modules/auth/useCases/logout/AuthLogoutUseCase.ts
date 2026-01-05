import { UseCase } from '@/lib/UseCase'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { AuthLogoutJobInterface } from './AuthLogoutJobInterface'

/**
 * @class AuthLogoutUseCase
 * @description Handles user logout by invalidating the current session.
 *
 * Use Case Flow:
 * 1. Extract sessionId from authenticated user context
 * 2. Delete session from Redis
 * 3. Log the logout event for audit
 * 4. Return success response
 *
 * Security Notes:
 * - Requires authentication (user must be logged in)
 * - Only affects the current session (not all user sessions)
 * - Session is permanently deleted (cannot be recovered)
 *
 * @permission auth.logout
 */
export class AuthLogoutUseCase extends UseCase<AuthLogoutJobInterface> {
	static readonly permission: string = 'auth.logout'

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * Provides the validation schema and data for the `auth.logout` permission check.
	 * @param {JobInterface} job - The job object containing the user context and request metadata.
	 * @param {DependencyContainer} container - The application's dependency container.
	 * @returns {Promise<UseCasePermissionValidationData>} A promise that resolves to the schema and data for validation.
	 */
	static async getPermissionValidationData(
		job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		const { schema, data } = this.buildPermissionSchema(this.permission, job)

		return {
			data,
			schema
		}
	}

	async run(
		job: AuthLogoutJobInterface
	): Promise<UseCaseResponseInterface<{ message: string }>> {
		const user = job.getUser()
		const meta = job.getMeta()
		const sessionId = meta.sessionId as string | undefined

		if (!sessionId) {
			job.logger.error(
				{ userId: user.id },
				'Logout attempted without sessionId'
			)
			throw new Error('Session information not found')
		}

		job.logger.info({ userId: user.id, sessionId }, 'Processing logout request')

		// Get session repository
		const sessionRepository = this.container.repositoryManager.get('session')

		// Delete the current session
		const deleted = await sessionRepository.deleteSession(sessionId)

		if (!deleted) {
			job.logger.warn(
				{ userId: user.id, sessionId },
				'Session not found or already expired'
			)
			// Still return success as session is effectively gone
		} else {
			job.logger.info(
				{ userId: user.id, sessionId },
				'Session deleted successfully'
			)
		}

		return {
			data: {
				message: 'Logout successful'
			},
			metadata: {
				loggedOutAt: new Date().toISOString(),
				sessionId
			}
		}
	}
}
