import { PermissionScope } from '@/modules/permission/entities/Permission'
import {
	RolePermissionDetail,
	RoleWithPermissions
} from '@/modules/role/entities/Role'
import { RoleWithPermissionsPayload } from '@/modules/role/repository/RoleRepository'
import { BaseMapper } from './BaseMapper'
import { RoleMapper } from './RoleMapper'

/**
 * Mapper for transforming Prisma Role models with permissions to domain RoleWithPermissions entities.
 * This mapper handles the complex nested structure of role permissions.
 */
export class RoleWithPermissionsMapper extends BaseMapper<
	RoleWithPermissionsPayload,
	RoleWithPermissions
> {
	private roleMapper = new RoleMapper()

	/**
	 * Maps a Prisma Role with permissions to a domain RoleWithPermissions entity.
	 * @param {RoleWithPermissionsPayload} prismaRoleWithPermissions - The role object from Prisma with nested permissions.
	 * @returns {RoleWithPermissions} The mapped domain RoleWithPermissions entity.
	 */
	mapToDomain(
		prismaRoleWithPermissions: RoleWithPermissionsPayload
	): RoleWithPermissions {
		const { rolePermissions, ...roleData } = prismaRoleWithPermissions

		// Only active and non-deleted permissions
		const mappedRolePermissions = rolePermissions
			.filter(rp => !rp.permission.deletedAt && rp.permission.active)
			.map(rp => ({
				permission: {
					...rp.permission,
					scope: rp.permission.scope as PermissionScope,
					config: {
						...(rp.permission.config as Record<string, any>)
					} as Record<string, any>
				},
				config: rp.config
			})) as RolePermissionDetail[]

		return {
			...this.roleMapper.mapToDomain(roleData),
			rolePermissions: mappedRolePermissions
		}
	}
}
