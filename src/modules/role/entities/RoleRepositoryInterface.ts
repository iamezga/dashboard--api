import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import {
	Role,
	RoleCreateInput,
	RoleUpdateInput,
	RoleWithPermissions
} from './Role'

/**
 * @interface RoleRepositoryInterface
 * @description Defines the contract for role data access operations.
 * Extends base CRUD operations.
 */
export interface RoleRepositoryInterface
	extends RepositoryInterface<Role, RoleCreateInput, RoleUpdateInput> {
	findByIdWithPermissions(
		id: string,
		organizationId?: string
	): Promise<RoleWithPermissions | null>
	findByName(name: string, organizationId: string): Promise<Role | null>
	assignPermissionsToRole(
		roleId: string,
		permissionIds: string[],
		organizationId?: string
	): Promise<void>
	removePermissionsFromRole(
		roleId: string,
		permissionIds: string[],
		organizationId?: string
	): Promise<void>
}
