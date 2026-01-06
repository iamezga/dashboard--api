import { OrganizationBasicInfo } from '@/modules/organization/entities/Organization'
import { UserPermission } from '@/modules/user/entities/User'

/**
 * @interface UserLoginDetails
 * @description Represents the public user data returned after a successful login.
 */
export interface UserLoginDetails {
	id: string
	organizationId: string
	email: string
	name: string
	surname: string | null
	roleId: string
	active: boolean
	config: Record<string, any>
}

/**
 * @interface LoginOutput
 * @description Defines the structure of the data returned upon a successful user login,
 */
export interface LoginOutput {
	token: string
	user: UserLoginDetails
}

/**
 * @interface UserAuthDetails
 * @description Defines the essential user data required for authentication processing,
 * including minimal organization information for permission validation.
 */
export interface UserAuthDetails {
	id: string
	organizationId: string
	email: string
	passwordHash: string
	active: boolean
	name: string
	surname: string | null
	roleId: string
	config: Record<string, any>
	userPermissions: UserPermission[]
	organization: OrganizationBasicInfo
	lastLogin: Date | null
	createdAt: Date
	updatedAt: Date
	deletedAt: Date | null
}

/**
 * @interface JwtUserPayload
 * @description Define the payload to generate the token.
 */
export interface JwtUserPayload {
	userId: string
	organizationId: string
	roleId: string
	sessionId: string
}

/**
 * @interface DecodedUserToken
 * @description Defines the expected payload structure after decoding a JWT.
 * This should match what is put into the token during login, plus standard JWT claims.
 */
export interface DecodedUserToken {
	userId: string
	organizationId: string
	roleId: string
	sessionId: string
	iat: number // Issued at (timestamp)
	exp: number // Expiration time (timestamp)
}
