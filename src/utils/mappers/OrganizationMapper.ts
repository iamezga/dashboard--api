import { Organization as PrismaOrganizationModel } from '@/generated/prisma/client'
import { Organization } from '@/modules/organization/entities/Organization'
import { BaseMapper } from './BaseMapper'

/**
 * @class OrganizationMapper
 * @extends BaseMapper
 * @description Maps Prisma Organization model to domain Organization entity.
 * Handles transformation of organization data in the multi-tenant architecture.
 *
 * Organizations represent tenants in the system. Each organization has:
 * - Isolated data (users, roles, permissions)
 * - Contact information (email, phone, address)
 * - Scope (SYSTEM for platform admin, TENANT for customers)
 */
export class OrganizationMapper extends BaseMapper<
	PrismaOrganizationModel,
	Organization
> {
	/**
	 * Transforms a Prisma Organization model to a domain Organization entity.
	 *
	 * @param {PrismaOrganizationModel} prismaOrganization - The Prisma organization model from database
	 * @returns {Organization} The domain organization entity
	 */
	mapToDomain(prismaOrganization: PrismaOrganizationModel): Organization {
		return {
			id: prismaOrganization.id,
			name: prismaOrganization.name,
			email: prismaOrganization.email,
			phone: prismaOrganization.phone,
			address: prismaOrganization.address,
			timezone: prismaOrganization.timezone,
			scope: prismaOrganization.scope,
			config: prismaOrganization.config as Record<string, any>,
			createdAt: prismaOrganization.createdAt,
			updatedAt: prismaOrganization.updatedAt,
			deletedAt: prismaOrganization.deletedAt
		}
	}
}
