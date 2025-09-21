import { RepositoryInterface } from '@/types/repository/RepositoryInterface'
import {
	Permission,
	PermissionCreateInput,
	PermissionUpdateInput
} from './Permission'

/**
 * @interface PermissionRepositoryInterface
 * @description Defines the contract for permission data access operations.
 * Extends base CRUD operations.
 */
export interface PermissionRepositoryInterface
	extends RepositoryInterface<
		Permission,
		PermissionCreateInput,
		PermissionUpdateInput
	> {
	findById(id: string): Promise<Permission | null>
	create(data: PermissionCreateInput): Promise<Permission>
	update(id: string, data: PermissionUpdateInput): Promise<Permission | null>
	delete(id: string): Promise<boolean>
	findByKey(key: string): Promise<Permission | null>
	findByKeys(keys: string[]): Promise<Permission[]>
}
