import { Organization as PrismaOrganizationModel } from '@/generated/prisma/client'
import { Organization } from '@/modules/organization/entities/Organization'
import { BaseMapper } from './BaseMapper'

/**
 * Mapper for transforming Prisma Organization models to domain Organization entities.
 */
export class OrganizationMapper extends BaseMapper<
	PrismaOrganizationModel,
	Organization
> {
	/**
	 * Maps a Prisma Organization to a domain Organization entity.
	 * @param {PrismaOrganizationModel} prismaOrganization - The organization object from Prisma.
	 * @returns {Organization} The mapped domain Organization entity.
	 */
	mapToDomain(prismaOrganization: PrismaOrganizationModel): Organization {
		return {
			id: prismaOrganization.id,
			name: prismaOrganization.name,
			email: prismaOrganization.email,
			phone: prismaOrganization.phone,
			address: prismaOrganization.address,
			createdAt: prismaOrganization.createdAt,
			updatedAt: prismaOrganization.updatedAt,
			deletedAt: prismaOrganization.deletedAt
		}
	}
}
