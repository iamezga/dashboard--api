import { vi } from 'vitest'
import { DependencyContainer } from '../../../types/core/dependencyContainer'
import { MembershipRepository } from './MembershipRepository'

describe('MembershipRepository', () => {
	let repository: MembershipRepository
	let dbMock: any
	let containerMock: DependencyContainer

	beforeEach(() => {
		dbMock = {
			membership: {
				findFirst: vi.fn(),
				findMany: vi.fn()
			}
		}
		containerMock = {
			logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn() }
		} as unknown as DependencyContainer
		repository = new MembershipRepository(dbMock, containerMock)
	})

	it('should find membership by user and organization', async () => {
		dbMock.membership.findFirst.mockResolvedValue({
			id: 'm1',
			organization: {
				id: 'o1',
				name: 'Org1',
				timezone: 'UTC',
				scope: 'TENANT'
			},
			role: { id: 'r1', name: 'admin', label: 'Admin', scope: 'SYSTEM' },
			status: 'active',
			isOwner: true,
			config: { foo: 'bar' },
			invitedAt: null,
			joinedAt: new Date(),
			createdAt: new Date(),
			updatedAt: new Date(),
			deletedAt: null
		})
		const result = await repository.findById('m1')
		expect(dbMock.membership.findFirst).toHaveBeenCalledWith({
			where: {
				id: 'm1',
				status: 'active',
				deletedAt: null,
				user: { deletedAt: null, status: 'active' }
			},
			include: {
				organization: {
					select: { id: true, name: true, timezone: true, scope: true }
				},
				role: { select: { id: true, name: true, label: true, scope: true } }
			}
		})
		expect(result).toMatchObject({
			id: 'm1',
			organization: {
				id: 'o1',
				name: 'Org1',
				timezone: 'UTC',
				scope: 'TENANT'
			},
			role: { id: 'r1', name: 'admin', label: 'Admin', scope: 'SYSTEM' },
			status: 'active',
			isOwner: true
		})
	})

	it('should return null if membership not found', async () => {
		dbMock.membership.findFirst.mockResolvedValue(null)
		const result = await repository.findById('m2')
		expect(result).toBeNull()
	})

	it('should find all memberships for a user', async () => {
		dbMock.membership.findMany.mockResolvedValue([
			{
				id: 'm1',
				organization: {
					id: 'o1',
					name: 'Org1',
					timezone: 'UTC',
					scope: 'TENANT'
				},
				role: { id: 'r1', name: 'admin', label: 'Admin', scope: 'SYSTEM' },
				status: 'active',
				isOwner: false,
				config: {},
				invitedAt: null,
				joinedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			},
			{
				id: 'm2',
				organization: {
					id: 'o2',
					name: 'Org2',
					timezone: 'UTC',
					scope: 'SYSTEM'
				},
				role: { id: 'r2', name: 'user', label: 'User', scope: 'TENANT' },
				status: 'pending',
				isOwner: true,
				config: {},
				invitedAt: null,
				joinedAt: null,
				createdAt: new Date(),
				updatedAt: new Date(),
				deletedAt: null
			}
		])
		const result = await repository.findAllByUser('u1')
		expect(dbMock.membership.findMany).toHaveBeenCalledWith({
			where: { userId: 'u1', deletedAt: null },
			include: {
				organization: {
					select: { id: true, name: true, timezone: true, scope: true }
				},
				role: { select: { id: true, name: true, label: true, scope: true } }
			}
		})
		expect(result).toHaveLength(2)
		expect(result[0].organization.id).toBe('o1')
		expect(result[1].organization.id).toBe('o2')
	})
})
