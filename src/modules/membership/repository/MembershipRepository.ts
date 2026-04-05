import {
	MembershipCreateInput,
	MembershipUpdateInput
} from '@/generated/prisma/models'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { Logger } from 'pino'
import { Membership } from '../entities/Membership'
import { MembershipRepositoryInterface } from '../entities/MembershipRepositoryInterface'

export class MembershipRepository implements MembershipRepositoryInterface {
	static name = 'membership' as const
	static provider: keyof DatabaseClientsMap = 'postgres'
	private readonly logger: Logger

	constructor(
		private readonly db: DatabaseClientsMap['postgres'],
		private readonly container: DependencyContainer
	) {
		this.db = db
		this.logger = container.logger

		this.logger.info(`Repository initialized: ${MembershipRepository.name}`)
	}

	findAll(_organizationId?: string): Promise<Membership[]> {
		throw new Error('Method not implemented.')
	}

	async create(data: MembershipCreateInput): Promise<Membership> {
		const membership = await this.db.membership.create({
			data
		})

		return membership as unknown as Membership
	}

	update(_id: string, _data: MembershipUpdateInput): Promise<Membership> {
		throw new Error('Method not implemented.')
	}

	delete(_id: string): Promise<boolean> {
		throw new Error('Method not implemented.')
	}

	/**
	 * Finds a membership by its ID.
	 */
	async findById(id: string): Promise<Membership | null> {
		const member = await this.db.membership.findFirst({
			where: {
				id,
				deletedAt: null,
				status: 'active', // Ensure the membership is active
				user: { deletedAt: null, status: 'active' } // Ensure the user is active
			},
			include: {
				organization: {
					select: { id: true, name: true, timezone: true, scope: true }
				},
				role: {
					select: {
						id: true,
						name: true,
						label: true,
						scope: true
					}
				}
			}
		})
		if (!member) return null

		return {
			id: member.id,
			organization: {
				id: member.organization.id,
				name: member.organization.name,
				timezone: member.organization.timezone,
				scope: member.organization.scope as 'TENANT' | 'SYSTEM'
			},
			role: {
				id: member.role.id,
				name: member.role.name,
				label: member.role.label,
				scope: member.role.scope as 'TENANT' | 'SYSTEM'
			},
			status: member.status,
			isOwner: member.isOwner,
			config: member.config as Record<string, any>,
			invitedAt: member.invitedAt,
			joinedAt: member.joinedAt,
			createdAt: member.createdAt,
			updatedAt: member.updatedAt,
			deletedAt: member.deletedAt
		}
	}

	/**
	 * Finds all memberships for a user.
	 */
	async findAllByUser(userId: string): Promise<Membership[]> {
		const members = await this.db.membership.findMany({
			where: { userId, deletedAt: null },
			include: {
				organization: {
					select: { id: true, name: true, timezone: true, scope: true }
				},
				role: { select: { id: true, name: true, label: true, scope: true } }
			}
		})
		return members.map(member => ({
			id: member.id,
			organization: {
				id: member.organization.id,
				name: member.organization.name,
				timezone: member.organization.timezone,
				scope: member.organization.scope as 'TENANT' | 'SYSTEM'
			},
			role: {
				id: member.role.id,
				name: member.role.name,
				label: member.role.label,
				scope: member.role.scope as 'TENANT' | 'SYSTEM'
			},
			status: member.status,
			isOwner: member.isOwner,
			config: member.config as Record<string, any>,
			invitedAt: member.invitedAt,
			joinedAt: member.joinedAt,
			createdAt: member.createdAt,
			updatedAt: member.updatedAt,
			deletedAt: member.deletedAt
		}))
	}

	async getPermissions(id: string) {
		const member = await this.db.membership.findFirst({
			where: {
				id,
				deletedAt: null,
				status: 'active' // Ensure the membership is active
			},
			include: {
				permissions: {
					where: { deletedAt: null },
					include: { permission: true }
				},
				role: {
					include: {
						permissions: {
							where: { deletedAt: null },
							include: { permission: true }
						}
					}
				}
			}
		})
		if (!member) {
			throw new Error('Membership not found or inactive')
		}

		const rolePermissions = member.role.permissions.reduce(
			(acc, curr) => {
				if (!curr.permission.active || curr.permission.deletedAt) return acc
				const permission = this.container.utils.deepMerge(curr.permission, {
					config: curr.config
				})
				return (acc = { ...acc, [curr.permission.key]: permission })
			},

			<Record<string, any>>{}
		)

		const membershipPermissions = member.permissions.reduce(
			(acc, curr) => {
				if (!curr.permission.active || curr.permission.deletedAt) return acc
				const permission = this.container.utils.deepMerge(curr.permission, {
					config: curr.config
				})
				return (acc = { ...acc, [curr.permission.key]: permission })
			},

			<Record<string, any>>{}
		)

		return this.container.utils.deepMerge(
			rolePermissions,
			membershipPermissions
		)
	}
}
