/**
 * Base Repository Interface
 *
 * This interface defines the contract that all repositories must implement.
 * It enforces constructor signature consistency while allowing flexible dependency extraction.
 *
 * Architecture Pattern:
 * - All repositories receive the DependencyContainer in their constructor
 * - Each repository extracts only the dependencies it needs
 * - This allows repositories to add/remove dependencies without changing the contract
 * - Repositories are fully initialized after instantiation (no setContext pattern)
 *
 * Benefits:
 * 1. Type-safe: All repositories have the same constructor signature
 * 2. Flexible: Each repo can extract different dependencies without breaking the contract
 * 3. Testable: Easy to mock the entire container
 * 4. Scalable: New dependencies can be added to container without repo changes
 * 5. Clear initialization: Repos are 100% ready after constructor
 * 6. No circular dependencies: Container is passed, not stored globally
 */
export interface BaseRepository {
	/**
	 * Standard constructor for all repositories.
	 * @param container - DependencyContainer with all available services and repositories
	 *
	 * Usage in repository constructor:
	 * ```typescript
	 * constructor(
	 *   private readonly db: DatabaseClientsMap['postgres'],
	 *   container: DependencyContainer
	 * ) {
	 *   this.logger = container.logger
	 *   this.repositoryManager = container.repositoryManager
	 *   // Extract only what this repo needs
	 * }
	 * ```
	 */
	readonly logger: any // Pino logger
	readonly repositoryManager: any // RepositoryManager for cross-repo access
}
