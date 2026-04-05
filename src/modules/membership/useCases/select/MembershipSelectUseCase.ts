import { ForbiddenError, UnauthorizedError } from '@/errors'
import { UseCase } from '@/lib/UseCase'
import { SessionContext } from '@/modules/session/entities/Session'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCasePermissionValidationData } from '@/types/useCase/UseCasePermissionValidationData'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'
import { MembershipSelectJobInterface } from './MembershipSelectJobInterface'

interface MembershipSelectOutput {
	activeMembership: {
		id: string
		organization: Record<string, any>
		role: Record<string, any>
		selectedAt: number
	}
}

export class MembershipSelectUseCase extends UseCase<MembershipSelectJobInterface> {
	static readonly permission: string | undefined = undefined // Public use case

	constructor(container: DependencyContainer) {
		super(container)
	}

	/**
	 * TODO - Add permission validation with access control.
	 */
	static async getPermissionValidationData(
		_job: JobInterface,
		_container: DependencyContainer
	): Promise<UseCasePermissionValidationData> {
		return {
			data: {},
			schema: {}
		}
	}

	async run(
		job: MembershipSelectJobInterface
	): Promise<UseCaseResponseInterface<MembershipSelectOutput>> {
		const { id } = job.getData()
		const { sessionId } = job.getMeta()

		if (!sessionId) {
			throw new UnauthorizedError('Authentication failed.')
		}

		const authenticatedUser = job.getUser() as any
		const userMemberships = Array.isArray(authenticatedUser.memberships)
			? authenticatedUser.memberships
			: []

		const canSelectMembership = userMemberships.some(
			(membership: { id: string }) => membership.id === id
		)

		if (!canSelectMembership) {
			await this.container.services.auditService.record(
				'security.forbidden_access',
				job,
				'membership',
				id,
				{
					reason: 'membership_not_owned',
					sessionId,
					membershipId: id
				},
				undefined,
				{
					category: 'security',
					severity: 'warning',
					result: {
						status: 'denied',
						errorCode: 'membership_select_forbidden',
						message: 'You do not have access to this membership.'
					},
					tags: ['membership', 'selection']
				}
			)

			throw new ForbiddenError('You do not have access to this membership.')
		}

		const membershipRepository =
			this.container.repositoryManager.get('membership')
		const sessionRepository = this.container.repositoryManager.get('session')

		const membership = await membershipRepository.findById(id)

		if (!membership) {
			throw new Error('Membership not found')
		}

		const permissions = await membershipRepository.getPermissions(id)

		const sessionMetadata =
			await sessionRepository.getSessionMetadata(sessionId)
		if (!sessionMetadata) {
			throw new UnauthorizedError('Authentication failed.')
		}

		const sessionContext: SessionContext | null =
			await sessionRepository.getSessionContext(sessionId)
		if (!sessionContext) {
			await sessionRepository.deleteSession(sessionId)
			throw new UnauthorizedError('Authentication failed.')
		}

		const selectedAt = Date.now()
		const updatedContext: SessionContext = {
			...sessionContext,
			activeMembership: {
				id: membership.id,
				organization: membership.organization,
				role: membership.role,
				permissions,
				selectedAt
			}
		}

		const updated = await sessionRepository.updateSessionContext(
			sessionId,
			updatedContext,
			sessionMetadata.maxSessionTime
		)

		if (!updated) {
			throw new Error('Could not update session context in Redis.')
		}

		job.setUser({
			...authenticatedUser,
			membership,
			organization: membership.organization,
			permissions,
			memberships: updatedContext.memberships
		})

		await this.container.services.auditService.record(
			'membership.selected',
			job,
			'membership',
			membership.id,
			{
				sessionId,
				organizationId: membership.organization?.id,
				roleId: membership.role?.id,
				selectedAt
			},
			undefined,
			{
				category: 'operational',
				severity: 'info',
				result: {
					status: 'success'
				},
				tags: ['membership', 'selection']
			}
		)

		return {
			data: {
				activeMembership: {
					id: membership.id,
					organization: membership.organization,
					role: membership.role,
					selectedAt
				}
			},
			metadata: {}
		}
	}
}
