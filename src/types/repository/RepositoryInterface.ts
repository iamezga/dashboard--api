import { DependencyContainer } from '@/core/dependencyContainer'

/**
 * Base interface for all repositories.
 * Provides standard CRUD operations to be implemented by each repository.
 *
 * @template T The entity type handled by the repository.
 */
export interface RepositoryInterface<T, CreateInput, UpdateInput> {
	setContext(container: DependencyContainer): void
	findById(id: string, organizationId?: string): Promise<T | null>
	create(data: CreateInput): Promise<T>
	update(
		id: string,
		data: UpdateInput,
		organizationId?: string
	): Promise<T | null>
	delete(id: string, organizationId?: string): Promise<boolean>
	findAll(organizationId?: string): Promise<T[]>
}
