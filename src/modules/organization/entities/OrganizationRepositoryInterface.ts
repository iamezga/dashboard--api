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
	findByName(name: string): Promise<Organization | null>
}
