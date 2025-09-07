import { PermissionScope } from '@prisma/client' // Importar PermissionScope de Prisma
// Importar la entidad User si los permisos se almacenan aquí o para referencias

/**
 * @interface MergedPermissionData
 * @description Represents a single permission with its effective, merged configuration
 * for a specific user session. This includes properties from the Permission entity
 * and the final configuration resulting from merging permission config, role-specific,
 * and user-specific overrides.
 */
export interface MergedPermissionData {
	key: string // eg., 'auth.login'
	label: string
	description?: string
	scope: PermissionScope // (GLOBAL,USER, ORGANIZATION, MODULE, )
	config: Record<string, any>
}

/**
 * @interface SessionUser
 * @description Represents a snapshot of user data stored within the session.
 * Contains frequently needed but less volatile user information.
 */
export interface SessionUser {
	id: string
	organizationId: string
	roleId: string
	name: string
	surname: string | null
	email: string
}

/**
 * @interface SessionData
 * @description Represents the structure of session data stored in Redis.
 */
export interface SessionData {
	user: SessionUser // User data snapshot
	permissions: Record<string, MergedPermissionData>
	sessionStartTime: number
	lastActivity: number
	maxSessionTime: number
	maxInactiveTime: number
	config?: Record<string, any>
}
