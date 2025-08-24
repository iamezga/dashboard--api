import { AuditRepositoryInterface, MongoAuditRepository } from './audit'
import {
	PermissionRepositoryInterface,
	PostgresPermissionRepository
} from './permission'
import { PostgresUserRepository, UserRepositoryInterface } from './user'

export const repositories = {
	PostgresUserRepository,
	PostgresPermissionRepository,
	MongoAuditRepository
}

/**
 * @type RepositoryMap
 * @description Defines the shape of the `repositories` object within the Dependency Container,
 * mapping normalized repository names (e.g., 'user', 'audit') to their corresponding interfaces.
 */
export type RepositoryMap = {
	user: UserRepositoryInterface
	permission: PermissionRepositoryInterface
	audit: AuditRepositoryInterface
}
