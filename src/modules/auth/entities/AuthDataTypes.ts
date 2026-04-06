import { Membership } from '@/modules/membership/entities/Membership'

/**
 * @interface UserLoginDetails
 * @description Represents the public user data returned after a successful login.
 */
export interface UserLoginDetails {
	id: string
	email: string
	name: string
	surname: string | null
	status: string
	memberships: Membership[]
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
 * now includes all memberships for multi-tenant architecture.
 */
export interface UserAuthDetails {
	id: string
	email: string
	passwordHash: string
	status: string
	name: string
	surname: string | null
	config: Record<string, any>
	memberships: Membership[]
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
	sessionId: string
}

/**
 * @interface DecodedUserToken
 * @description Defines the expected payload structure after decoding a JWT.
 * This should match what is put into the token during login, plus standard JWT claims.
 */
export interface DecodedUserToken extends JwtUserPayload {
	iat: number
	exp: number
}
