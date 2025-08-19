/**
 * @interface UserLoginDetails
 * @description Represents the public user data returned after a successful login.
 */
export interface UserLoginDetails {
	id: string
	organizationId: string | null
	email: string
	name: string
	surname: string | null
	roleId: string | null
	active: boolean
	config: object
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
 */
export interface UserAuthDetails {
	id: string
	organizationId: string | null
	email: string
	passwordHash: string
	active: boolean
	name: string
	surname: string | null
	roleId: string | null
	config: object
	lastLogin: Date | null
}
