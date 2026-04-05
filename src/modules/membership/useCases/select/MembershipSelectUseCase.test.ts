import { ForbiddenError, UnauthorizedError } from '../../../../errors'
import { DependencyContainer } from '../../../../types/core/dependencyContainer'
import { MembershipSelectJobInterface } from './MembershipSelectJobInterface'
import { MembershipSelectUseCase } from './MembershipSelectUseCase'

describe('MembershipSelectUseCase', () => {
	const membershipRepository = {
		findById: jest.fn(),
		getPermissions: jest.fn()
	}

	const sessionRepository = {
		getSessionMetadata: jest.fn(),
		getSessionContext: jest.fn(),
		updateSessionContext: jest.fn(),
		deleteSession: jest.fn()
	}

	const auditService = {
		record: jest.fn()
	}

	const makeContainer = (): DependencyContainer =>
		({
			repositoryManager: {
				get: (name: string) => {
					if (name === 'membership') return membershipRepository
					if (name === 'session') return sessionRepository
					throw new Error(`Repo ${name} not mocked`)
				}
			},
			services: {
				auditService
			}
		}) as unknown as DependencyContainer

	const makeJob = (overrides: Partial<MembershipSelectJobInterface> = {}) =>
		({
			getData: () => ({ id: 'membership-1' }),
			getMeta: () => ({ sessionId: 'session-1' }),
			getUser: () => ({
				id: 'user-1',
				memberships: [{ id: 'membership-1' }]
			}),
			setUser: jest.fn(),
			...overrides
		}) as unknown as MembershipSelectJobInterface

	beforeEach(() => {
		jest.clearAllMocks()
		auditService.record.mockResolvedValue(undefined)
	})

	it('should throw unauthorized when sessionId is missing', async () => {
		const useCase = new MembershipSelectUseCase(makeContainer())
		const job = makeJob(<any>{
			getMeta: () => ({
				timestamp: Date.now(),
				method: 'POST',
				url: '/v1/membership/select'
			})
		})

		await expect(useCase.run(job)).rejects.toBeInstanceOf(UnauthorizedError)
		expect(auditService.record).not.toHaveBeenCalled()
	})

	it('should audit and throw forbidden when membership is not owned by user', async () => {
		const useCase = new MembershipSelectUseCase(makeContainer())
		const job = makeJob(<any>{
			getData: () => ({ id: 'membership-2' }),
			getUser: (() => ({
				id: 'user-1',
				memberships: [{ id: 'membership-1' }]
			})) as any
		})

		await expect(useCase.run(job)).rejects.toBeInstanceOf(ForbiddenError)
		expect(auditService.record).toHaveBeenCalledWith(
			'security.forbidden_access',
			job,
			'membership',
			'membership-2',
			expect.objectContaining({
				reason: 'membership_not_owned',
				sessionId: 'session-1',
				membershipId: 'membership-2'
			}),
			undefined,
			expect.objectContaining({
				category: 'security',
				severity: 'warning',
				result: expect.objectContaining({ status: 'denied' })
			})
		)
	})

	it('should select membership and emit membership.selected audit event', async () => {
		const useCase = new MembershipSelectUseCase(makeContainer())
		const setUser = jest.fn()
		const job = makeJob({ setUser } as Partial<MembershipSelectJobInterface>)

		const membership = {
			id: 'membership-1',
			organization: { id: 'org-1', name: 'Org' },
			role: { id: 'role-1', name: 'Admin' }
		}

		membershipRepository.findById.mockResolvedValue(membership)
		membershipRepository.getPermissions.mockResolvedValue({
			'user.read': true,
			'user.update': true
		})
		sessionRepository.getSessionMetadata.mockResolvedValue({
			maxSessionTime: 3600
		})
		sessionRepository.getSessionContext.mockResolvedValue({
			memberships: [membership],
			activeMembership: null
		})
		sessionRepository.updateSessionContext.mockResolvedValue(true)

		const result = await useCase.run(job)

		expect(result.data.activeMembership.id).toBe('membership-1')
		expect(sessionRepository.updateSessionContext).toHaveBeenCalled()
		expect(setUser).toHaveBeenCalled()
		expect(auditService.record).toHaveBeenCalledWith(
			'membership.selected',
			job,
			'membership',
			'membership-1',
			expect.objectContaining({
				sessionId: 'session-1',
				organizationId: 'org-1',
				roleId: 'role-1'
			}),
			undefined,
			expect.objectContaining({
				category: 'operational',
				severity: 'info',
				result: { status: 'success' }
			})
		)
	})
})
