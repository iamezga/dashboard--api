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
	setContext(container: DependencyContainer): void
}

/**
 * @function createRepositoryManager
 * @description Factory function that creates and initializes a repository manager.
 * It instantiates all registered repositories, injecting the corresponding database client.
 * @param {DatabaseClientsMap} clients - A map of active database clients.
 * @returns {RepositoryManager} A new instance of the repository manager.
 */
export function createRepositoryManager(
	clients: DatabaseClientsMap
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
		repos[repoName] = new (RepoClass as any)(
			client
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

			return new RepoClass(client)
		},
		getAll(): RepositoryMap {
			return repos as RepositoryMap
		},
		setContext(container: DependencyContainer) {
			Object.values(repos).forEach(repo => repo.setContext(container))
		}
	}
}

let repositoryManagerInstance: RepositoryManager | null = null

/**
 * @function getRepositoryManager
 * @description Retrieves the singleton instance of the repository manager.
 * If it doesn't exist, it creates one using the initialized providers.
 * @returns {RepositoryManager} The singleton repository manager instance.
 */
export function getRepositoryManager(): RepositoryManager {
	if (repositoryManagerInstance) return repositoryManagerInstance

	repositoryManagerInstance = createRepositoryManager(databaseManager.getAll())

	return repositoryManagerInstance
}
