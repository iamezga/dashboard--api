import { Permission as PrismaPermissionModel } from '@/generated/prisma/client'
import {
	Permission,
	PermissionScope
} from '@/modules/permission/entities/Permission'
import { BaseMapper } from './BaseMapper'

/**
 * @class PermissionMapper
 * @extends BaseMapper
 * @description Maps Prisma Permission model to domain Permission entity.
 * Handles transformation of permission data including scope, configuration,
 * and module association.
 *
 * Permissions control access to use cases and features. They can be:
 * - SYSTEM-scoped: Platform-wide permissions
 * - TENANT-scoped: Organization-specific permissions
 * - MODULE-associated: Grouped by functional modules (auth, user, etc.)
 */
export class PermissionMapper extends BaseMapper<
	PrismaPermissionModel,
	Permission
> {
	/**
	 * Transforms a Prisma Permission model to a domain Permission entity.
	 *
	 * @param {PrismaPermissionModel} prismaPermission - The Prisma permission model from database
	 * @returns {Permission} The domain permission entity
	 */
	mapToDomain(prismaPermission: PrismaPermissionModel): Permission {
		return {
			id: prismaPermission.id,
			key: prismaPermission.key,
			label: prismaPermission.label,
			description: prismaPermission.description,
			active: prismaPermission.active,
			config: prismaPermission.config as Record<string, any>,
			moduleId: prismaPermission.moduleId,
			scope: prismaPermission.scope as PermissionScope,
			createdAt: prismaPermission.createdAt,
			updatedAt: prismaPermission.updatedAt,
			deletedAt: prismaPermission.deletedAt
		}
	}
}
