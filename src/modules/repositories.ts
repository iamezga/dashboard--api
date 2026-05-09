import { MongoAuditRepository, PostgresAuditRepository } from './audit'
import { AuditRepositoryInterface } from './audit/entities/AuditRepositoryInterface'
import { PasswordRecoveryTokenRepository } from './auth/repository/PasswordRecoveryTokenRepository'
import { MembershipRepository } from './membership'
import { OrganizationRepository } from './organization'
import { PermissionRepository } from './permission'
import { RoleRepository } from './role'
import { SessionRepository } from './session'
import { UserRepository } from './user'

export const repositories = {
	SessionRepository,
	OrganizationRepository,
	UserRepository,
	PermissionRepository,
	RoleRepository,
	MongoAuditRepository,
	PostgresAuditRepository,
	MembershipRepository,
	PasswordRecoveryTokenRepository
}

/**
 * @type RepositoryMap (derived)
 * @description Programmatically derives a map from the exported `repositories` object.
 * Keys are taken from each class' static `name` and values are the instance types.
 */
type RepositoriesType = typeof repositories

type DerivedRepositoryMap = {
	[Key in keyof RepositoriesType as RepositoriesType[Key] extends {
		name: infer N
	}
		? N extends string
			? N
			: never
		: never]: RepositoriesType[Key] extends new (
		...args: any[]
	) => infer Instance
		? Instance
		: never
}

// Override the logical 'audit' entry to the shared interface to avoid unions of concrete implementations
export type RepositoryMap = Omit<DerivedRepositoryMap, 'audit'> & {
	audit: AuditRepositoryInterface
}
