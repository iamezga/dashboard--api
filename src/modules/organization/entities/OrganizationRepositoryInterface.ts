import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import {
	Organization,
	OrganizationCreateInput,
	OrganizationUpdateInput
} from './Organization'

/**
 * @interface OrganizationRepositoryInterface
 * @extends RepositoryInterface
 * @description Defines the contract for organization data access operations.
 * Extends base CRUD operations and adds organization-specific retrieval methods.
 *
 * Organizations represent tenants in the multi-tenant architecture.
 * Each organization has isolated data (users, roles, etc.) and can be
 * either SYSTEM-scoped (platform administration) or TENANT-scoped (customer).
 */
export interface OrganizationRepositoryInterface
	extends RepositoryInterface<
		Organization,
		OrganizationCreateInput,
		OrganizationUpdateInput
	> {
	/**
	 * Finds an organization by its name.
	 *
	 * @param {string} name - The organization name to search for
	 * @returns {Promise<Organization | null>} The organization if found, null otherwise
	 */
	findByName(name: string): Promise<Organization | null>
}
