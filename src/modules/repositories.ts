import { AuditRepositoryInterface, MongoAuditRepository } from './audit'
import { PostgresUserRepository, UserRepositoryInterface } from './user'

export const repositories = {
	PostgresUserRepository,
	MongoAuditRepository
}

export type RepositoryMap = {
	userRepository: UserRepositoryInterface
	auditRepository: AuditRepositoryInterface
}
