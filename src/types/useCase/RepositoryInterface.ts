/**
 * Base interface for all repositories.
 * Provides standard CRUD operations to be implemented by each repository.
 *
 * @template T The entity type handled by the repository.
 */
export interface RepositoryInterface<T, Client = unknown> {
	readonly db: Client
	/**
	 * Find an entity by its identifier.
	 * @param id - The entity identifier.
	 * @returns The entity instance or null if not found.
	 */
	findById(id: string | number): Promise<T | null>

	/**
	 * Create a new entity.
	 * @param data - The data to create the entity.
	 * @returns The created entity instance.
	 */
	create(data: Partial<T>): Promise<T>

	/**
	 * Update an existing entity.
	 * @param id - The entity identifier.
	 * @param data - The partial data to update.
	 * @returns The updated entity instance or null if not found.
	 */
	update(id: string | number, data: Partial<T>): Promise<T | null>

	/**
	 * Delete an entity by its identifier.
	 * @param id - The entity identifier.
	 * @returns True if the entity was deleted, false otherwise.
	 */
	delete(id: string | number): Promise<boolean>

	/**
	 * List all entities.
	 * @returns An array of entities.
	 */
	findAll(): Promise<T[]>
}
