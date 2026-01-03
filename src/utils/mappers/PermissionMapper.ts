import { Permission as PrismaPermissionModel } from '@/generated/prisma/client'
import {
	Permission,
	PermissionScope
} from '@/modules/permission/entities/Permission'
import { BaseMapper } from './BaseMapper'

/**
 * Mapper for transforming Prisma Permission models to domain Permission entities.
 */
export class PermissionMapper extends BaseMapper<
	PrismaPermissionModel,
	Permission
> {
	/**
	 * Maps a Prisma Permission to a domain Permission entity.
	 * @param {PrismaPermissionModel} prismaPermission - The permission object from Prisma.
	 * @returns {Permission} The mapped domain Permission entity.
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
