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
	create(data: RoleCreateInput): Promise<Role>
	update(id: string, data: RoleUpdateInput): Promise<Role | null>
	delete(id: string): Promise<boolean>
	findByName(name: string, organizationId: string | null): Promise<Role | null>
	findById(id: string): Promise<Role | null>
	findByIdWithPermissions(id: string): Promise<RoleWithPermissions | null>
	assignPermissionsToRole(
		roleId: string,
		permissionIds: string[]
	): Promise<void>
	removePermissionsFromRole(
		roleId: string,
		permissionIds: string[]
	): Promise<void>
}
