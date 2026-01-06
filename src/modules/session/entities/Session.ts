import { OrganizationBasicInfo } from '@/modules/organization/entities/Organization'
import { UserMergedPermissions } from '@/modules/user/entities/User'

/**
 * @interface SessionUser
 * @description Represents a snapshot of user data stored within the session.
 * Contains frequently needed but less volatile user information.
 * Includes minimal organization info for permission validation.
 */
export interface SessionUser {
	id: string
	organizationId: string
	roleId: string
	name: string
	surname: string | null
	email: string
	permissions: UserMergedPermissions
	organization: OrganizationBasicInfo
}

/**
 * @interface SessionDataInput
 * @description Represents the structure of data to create a session in Redis.
 */
export interface SessionDataInput {
	userId: string
	sessionStartTime: number
	lastActivity: number
	maxSessionTime: number
	maxInactiveTime: number
}

/**
 * @interface SessionData
 * @description Represents the structure of session data stored in Redis.
 */
export interface SessionData extends SessionDataInput {
	sessionId: string
}
