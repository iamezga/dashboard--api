import {
	DatabaseClientsMap,
	databaseManager
} from '@/infrastructure/databaseManager'
import { repositories, RepositoryMap } from '@/modules/repositories'
import { config } from '@/services/config'
import { DependencyContainer } from '@/types/core/dependencyContainer'

export interface RepositoryManager {
	get<K extends keyof RepositoryMap>(name: K): RepositoryMap[K]
	create<K extends keyof RepositoryMap>(name: K): RepositoryMap[K]
	getAll(): RepositoryMap
}

/**
 * @function createRepositoryManager
 * @description Factory function that creates and initializes a repository manager.
 *
 * Architecture:
 * - All repositories receive DependencyContainer in their constructor
 * - Each repository extracts only the dependencies it needs
 * - No two-phase initialization (no setContext) required
 * - Repositories are 100% ready after instantiation
 *
 * @param {DatabaseClientsMap} clients - A map of active database clients
 * @param {DependencyContainer} container - Dependency container with logger and other services
 * @returns {RepositoryManager} A new instance of the repository manager
 */
export function createRepositoryManager(
	clients: DatabaseClientsMap,
	container: DependencyContainer
): RepositoryManager {
	const repos: Partial<
		Record<keyof RepositoryMap, RepositoryMap[keyof RepositoryMap]>
	> = {}

	const auditProvider = config.get('audit.provider') as unknown as string

	Object.values(repositories).forEach(RepoClass => {
		// If this is the logical 'audit' repository, only instantiate the implementation
		// that matches the configured audit provider. This allows multiple implementation
		// classes to exist while only one is activated.
		if (
			(RepoClass as any).name === 'audit' &&
			(RepoClass as any).provider !== auditProvider
		) {
			return
		}

		const providerKey = RepoClass.provider as keyof DatabaseClientsMap
		const client = clients[providerKey]
		if (!client) return

		const repoName = RepoClass.name as keyof RepositoryMap
		// Pass both database client and dependency container to repository constructor
		repos[repoName] = new (RepoClass as any)(
			client,
			container
		) as RepositoryMap[typeof repoName]
	})

	return {
		get<K extends keyof RepositoryMap>(name: K): RepositoryMap[K] {
			const repo = repos[name]
			if (!repo) throw new Error(`Repository "${String(name)}" not loaded`)
			return repo as RepositoryMap[K]
		},
		create<K extends keyof RepositoryMap>(name: K): RepositoryMap[K] {
			const RepoClass = Object.values(repositories).find(
				cls => cls.name === name
			) as any

			if (!RepoClass)
				throw new Error(`Repository class "${String(name)}" not found`)

			const providerKey = RepoClass.provider as keyof DatabaseClientsMap
			const client = clients[providerKey]
			if (!client)
				throw new Error(`DB client for repository "${String(name)}" not found`)

			// Pass both database client and dependency container to repository constructor
			return new RepoClass(client, container)
		},
		getAll(): RepositoryMap {
			return repos as RepositoryMap
		}
	}
}

let repositoryManagerInstance: RepositoryManager | null = null
let dependencyContainerInstance: DependencyContainer | null = null

/**
 * @function setDependencyContainerForRepositoryManager
 * @description Sets the dependency container to be used by the repository manager.
 * This is called during dependency container initialization to ensure repositories
 * can access all required dependencies.
 *
 * @param {DependencyContainer} container - The fully initialized dependency container
 */
export function setDependencyContainerForRepositoryManager(
	container: DependencyContainer
): void {
	dependencyContainerInstance = container
}

/**
 * @function getRepositoryManager
 * @description Retrieves the singleton instance of the repository manager.
 * If it doesn't exist, it creates one using the initialized providers and dependency container.
 *
 * Architecture:
 * - The dependency container must be set before retrieving the repository manager
 * - All repositories receive the container in their constructor
 * - No two-phase initialization needed
 *
 * @returns {RepositoryManager} The singleton repository manager instance.
 * @throws {Error} If dependency container has not been set
 */
export function getRepositoryManager(): RepositoryManager {
	if (repositoryManagerInstance) return repositoryManagerInstance

	if (!dependencyContainerInstance) {
		throw new Error(
			'Repository manager cannot be created: dependency container not initialized. ' +
				'Call setDependencyContainerForRepositoryManager before accessing repositories.'
		)
	}

	repositoryManagerInstance = createRepositoryManager(
		databaseManager.getAll(),
		dependencyContainerInstance
	)

	return repositoryManagerInstance
}

/**
 * Test helper: reset the repository manager instance and dependency container.
 */
export const resetRepositoryManager = (): void => {
	repositoryManagerInstance = null
	dependencyContainerInstance = null
}
