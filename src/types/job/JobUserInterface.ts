/**
 * @interface JobUserInterface
 * @description Defines the structure of the authenticated user data stored within the Job context.
 * This interface contains essential, non-sensitive user details required for authorization
 * and providing context to downstream use cases, after successful authentication.
 */
export interface JobUserInterface {
	id: string
	organizationId: string | null
	email: string
	roleId: string | null
	active: boolean
	config: object
}
