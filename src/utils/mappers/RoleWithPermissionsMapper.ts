import { PermissionScope } from '@/modules/permission/entities/Permission'
import {
	RolePermissionDetail,
	RoleWithPermissions
} from '@/modules/role/entities/Role'
import { RoleWithPermissionsPayload } from '@/modules/role/repository/RoleRepository'
import { BaseMapper } from './BaseMapper'
import { RoleMapper } from './RoleMapper'

/**
 * @class RoleWithPermissionsMapper
 * @extends BaseMapper
 * @description Maps Prisma Role models with nested permissions to domain RoleWithPermissions entities.
 * Handles complex nested structure including role data, associated permissions,
 * and permission configurations.
 *
 * This mapper filters out inactive and deleted permissions, ensuring only
 * active permissions are included in the final role entity. It combines
 * role-level and permission-level configuration data.
 */
export class RoleWithPermissionsMapper extends BaseMapper<
	RoleWithPermissionsPayload,
	RoleWithPermissions
> {
	private roleMapper = new RoleMapper()

	/**
	 * Transforms a Prisma Role with nested permissions to a domain RoleWithPermissions entity.
	 * Filters out inactive/deleted permissions and maps configuration data.
	 *
	 * @param {RoleWithPermissionsPayload} prismaRoleWithPermissions - The role from Prisma with nested permissions
	 * @returns {RoleWithPermissions} The domain role entity with filtered, active permissions
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
