import { Role as PrismaRoleModel } from '@/generated/prisma/client'
import { Role } from '@/modules/role/entities/Role'
import { BaseMapper } from './BaseMapper'

/**
 * @class RoleMapper
 * @extends BaseMapper
 * @description Maps Prisma Role model to domain Role entity.
 * Handles transformation of role data including scope (SYSTEM vs TENANT),
 * organization relationships, and role configuration.
 *
 * Roles define sets of permissions for RBAC. They can be:
 * - SYSTEM-scoped: Platform-wide roles (e.g., superAdmin)
 * - TENANT-scoped: Organization-specific roles (e.g., orgAdmin, member)
 */
export class RoleMapper extends BaseMapper<PrismaRoleModel, Role> {
	/**
	 * Transforms a Prisma Role model to a domain Role entity.
	 *
	 * @param {PrismaRoleModel} prismaRole - The Prisma role model from database
	 * @returns {Role} The domain role entity
	 */
	mapToDomain(prismaRole: PrismaRoleModel): Role {
		return {
			id: prismaRole.id,
			organizationId: prismaRole.organizationId,
			name: prismaRole.name,
			label: prismaRole.label,
			description: prismaRole.description,
			active: prismaRole.active,
			scope: prismaRole.scope,
			config: prismaRole.config as Record<string, any>,
			createdAt: prismaRole.createdAt,
			updatedAt: prismaRole.updatedAt,
			deletedAt: prismaRole.deletedAt
		}
	}
}
