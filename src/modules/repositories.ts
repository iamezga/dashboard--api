import { AuditRepositoryInterface, MongoAuditRepository } from './audit'
import {
	OrganizationRepositoryInterface,
	PostgresOrganizationRepository
} from './organization'
import {
	PermissionRepositoryInterface,
	PostgresPermissionRepository
} from './permission'
import { PostgresRoleRepository, RoleRepositoryInterface } from './role'
import { RedisSessionRepository, SessionRepositoryInterface } from './session'
import { PostgresUserRepository, UserRepositoryInterface } from './user'

export const repositories = {
	RedisSessionRepository,
	PostgresOrganizationRepository,
	PostgresUserRepository,
	PostgresPermissionRepository,
	PostgresRoleRepository,
	MongoAuditRepository
}

/**
 * @type RepositoryMap
 * @description Defines the shape of the `repositories` object within the Dependency Container,
 * mapping normalized repository names (e.g., 'user', 'audit') to their corresponding interfaces.
 */
export type RepositoryMap = {
	session: SessionRepositoryInterface
	organization: OrganizationRepositoryInterface
	user: UserRepositoryInterface
	permission: PermissionRepositoryInterface
	role: RoleRepositoryInterface
	audit: AuditRepositoryInterface
}
