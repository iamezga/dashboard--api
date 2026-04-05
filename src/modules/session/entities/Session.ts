import { Membership } from '@/modules/membership/entities/Membership'
import { OrganizationBasicInfo } from '@/modules/organization/entities/Organization'
import { Role } from '@/modules/role/entities/Role'
import { UserMergedPermissions } from '@/modules/user/entities/User'

/**
 * @interface SessionContextUser
 * @description Represents a snapshot of user data stored within the session.
 * Contains frequently needed but less volatile user information.
 * Includes minimal organization info for permission validation.
 */
export interface SessionContextUser {
	id: string
	email: string
	name: string
	surname: string | null
	status: string
	config: Record<string, any>
	lastLogin: Date | null
}

export interface SessionActiveMembership {
	id: string
	organization: OrganizationBasicInfo
	role: Pick<Role, 'id' | 'name' | 'label' | 'scope'>
	permissions: UserMergedPermissions
	selectedAt: number
}

export interface SessionContext {
	user: SessionContextUser
	memberships: Membership[]
	activeMembership: SessionActiveMembership | null
}

export interface SessionMetadataInput {
	userId: string
	sessionStartTime: number
	lastActivity: number
	maxSessionTime: number
	maxInactiveTime: number
}

export interface SessionMetadata extends SessionMetadataInput {
	sessionId: string
}
