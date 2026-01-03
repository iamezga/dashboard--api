import { Role as PrismaRoleModel } from '@/generated/prisma/client'
import { Role } from '@/modules/role/entities/Role'
import { BaseMapper } from './BaseMapper'

/**
 * Mapper for transforming Prisma Role models to domain Role entities.
 */
export class RoleMapper extends BaseMapper<PrismaRoleModel, Role> {
	/**
	 * Maps a Prisma Role to a domain Role entity.
	 * @param {PrismaRoleModel} prismaRole - The role object from Prisma.
	 * @returns {Role} The mapped domain Role entity.
	 */
	mapToDomain(prismaRole: PrismaRoleModel): Role {
		return {
			id: prismaRole.id,
			organizationId: prismaRole.organizationId,
			name: prismaRole.name,
			label: prismaRole.label,
			description: prismaRole.description,
			active: prismaRole.active,
			config: prismaRole.config as Record<string, any>,
			createdAt: prismaRole.createdAt,
			updatedAt: prismaRole.updatedAt,
			deletedAt: prismaRole.deletedAt
		}
	}
}
