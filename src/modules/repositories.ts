import { AuditRepository } from './audit'
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
	AuditRepository
}

/**
 * @type RepositoryMap
 * @description Defines the shape of the `repositories` object within the Dependency Container,
 * mapping normalized repository names (e.g., 'user', 'audit') to their corresponding interfaces.
 */
export type RepositoryMap = {
	[SessionRepository.name]: InstanceType<typeof SessionRepository>
	[OrganizationRepository.name]: InstanceType<typeof OrganizationRepository>
	[UserRepository.name]: InstanceType<typeof UserRepository>
	[PermissionRepository.name]: InstanceType<typeof PermissionRepository>
	[RoleRepository.name]: InstanceType<typeof RoleRepository>
	[AuditRepository.name]: InstanceType<typeof AuditRepository>
}
