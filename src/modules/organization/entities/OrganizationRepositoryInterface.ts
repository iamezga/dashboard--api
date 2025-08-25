import { DatabaseClients } from '@/services/databaseServiceManager'
import { RepositoryInterface } from '@/types/useCase/RepositoryInterface'
import { Organization } from './Organization'

/**
 * @interface OrganizationRepositoryInterface
 * @description Defines the contract for organization data access operations.
 * Extends base CRUD operations and adds organization-specific retrieval methods.
 */
export interface OrganizationRepositoryInterface
	extends RepositoryInterface<Organization, DatabaseClients['postgres']> {
	readonly name?: 'OrganizationRepository'

	/**
	 * Finds an organization by its unique name.
	 * @param {string} name - The unique name of the organization.
	 * @returns {Promise<Organization | null>} The organization entity or null if not found.
	 */
	findByName(name: string): Promise<Organization | null>
}
