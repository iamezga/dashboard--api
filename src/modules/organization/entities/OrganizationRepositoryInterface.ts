import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import {
	Organization,
	OrganizationCreateInput,
	OrganizationUpdateInput
} from './Organization'

/**
 * @interface OrganizationRepositoryInterface
 * @description Defines the contract for organization data access operations.
 * Extends base CRUD operations and adds organization-specific retrieval methods.
 */
export interface OrganizationRepositoryInterface
	extends RepositoryInterface<
		Organization,
		OrganizationCreateInput,
		OrganizationUpdateInput
	> {
	create(data: OrganizationCreateInput): Promise<Organization>
	update(
		id: string,
		data: OrganizationUpdateInput
	): Promise<Organization | null>
	delete(id: string): Promise<boolean>
	findById(id: string): Promise<Organization | null>

	/**
	 * Finds an organization by its unique name.
	 * @param {string} name - The unique name of the organization.
	 * @returns {Promise<Organization | null>} The organization entity or null if not found.
	 */
	findByName(name: string): Promise<Organization | null>
}
