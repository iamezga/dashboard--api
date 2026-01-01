import { MongoAuditRepository, PostgresAuditRepository } from './audit'
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
	PostgresAuditRepository
}

/**
 * @type RepositoryMap (derived)
 * @description Programmatically derives a map from the exported `repositories` object.
 * Keys are taken from each class' static `name` and values are the instance types.
 */
type RepositoriesType = typeof repositories

export type RepositoryMap = {
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
