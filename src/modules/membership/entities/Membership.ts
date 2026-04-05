import { OrganizationBasicInfo } from '@/modules/organization/entities/Organization'
import { Role } from '@/modules/role/entities/Role'

export interface Membership {
	id: string
	organization: OrganizationBasicInfo
	role: Pick<Role, 'id' | 'name' | 'label' | 'scope'>
	status: string
	isOwner: boolean
	config: Record<string, any>
	permissions?: Record<string, any>
	invitedAt: Date | null
	joinedAt: Date | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}
