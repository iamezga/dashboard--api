import { AuditRepositoryInterface, MongoAuditRepository } from './audit'
import { PostgresUserRepository, UserRepositoryInterface } from './user'

export const repositories = {
	PostgresUserRepository,
	MongoAuditRepository
}

/**
 * @type RepositoryMap
 * @description Defines the shape of the `repositories` object within the Dependency Container,
 * mapping normalized repository names (e.g., 'user', 'audit') to their corresponding interfaces.
 */
export type RepositoryMap = {
	user: UserRepositoryInterface
	audit: AuditRepositoryInterface
}
