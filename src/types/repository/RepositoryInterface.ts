/**
 * Base interface for all repositories.
 * Provides standard CRUD operations to be implemented by each repository.
 *
 * Repositories use constructor injection to receive dependencies.
 * They extract only the dependencies they need from the DependencyContainer.
 *
 * @template T The entity type handled by the repository.
 */
export interface RepositoryInterface<T, CreateInput, UpdateInput> {
	findById(id: string, organizationId?: string): Promise<T | null>
	create(data: CreateInput): Promise<T>
	update(id: string, data: UpdateInput, organizationId?: string): Promise<T>
	delete(id: string, organizationId?: string): Promise<boolean>
	findAll(organizationId?: string): Promise<T[]>
}
