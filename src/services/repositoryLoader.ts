import { repositories, RepositoryMap } from '@/modules/repositories'
import { DatabaseClients, DB_PREFIXES, DBType } from './databaseServiceManager'

/**
 * @function normalizeRepoName
 * @description Converts a concrete repository class name (e.g., "PostgresUserRepository")
 * into its normalized, camelCase form (e.g., "user").
 * This name is used as the key in the `repositories` object within the Dependency Container.
 * @param {string} className - The name of the concrete repository class.
 * @returns {string} The normalized repository name.
 * @throws {Error} If the class name does not start with a recognized DB prefix.
 * @example
 *
 * normalizeRepoName("PostgresUserRepository") -> Returns "user"
 * normalizeRepoName("MongoAuditRepository") -> Returns "audit"
 */
export function normalizeRepoName(className: string): string {
	const prefix = DB_PREFIXES.find(p => className.startsWith(p))
	if (!prefix) throw new Error(`DB prefix not supported in ${className}`)
	// Remove both the DB prefix and the "Repository" suffix, then convert to camelCase.
	const baseName = className.replace(prefix, '').replace('Repository', '')
	return baseName.charAt(0).toLowerCase() + baseName.slice(1)
}

/** Detects the type of DB from the name of the class */
export function detectDBType(className: string): DBType {
	const prefix = DB_PREFIXES.find(p => className.startsWith(p))
	if (!prefix) throw new Error(`DB could not be detected in ${className}`)
	return prefix.toLowerCase() as DBType
}

/**
 * @function loadRepositories
 * @description Dynamically instantiates and registers all repository classes in the project.
 * This loader detects the database type each repository is designed for
 * based on its class name (e.g., `PostgresUserRepository`, `MongoAuditRepository`)
 * and automatically injects the corresponding connected database client.
 * If a repository has a prefix that does not correspond to a database enabled by configuration, it will be ignored
 *
 * @param {DatabaseClients} clients - Active database clients available for injection into repositories.
 * @returns {RepositoryMap} A map of normalized repository names (e.g., 'user', 'audit') to their instantiated objects.
 */
export function loadRepositories(clients: DatabaseClients): RepositoryMap {
	const repos = {} as RepositoryMap

	Object.entries(repositories).forEach(([className, RepoClass]) => {
		// className e.g.: PostgresUserRepository -> detectDBType return postgres
		const dbClient = clients[detectDBType(className)]

		if (!dbClient) return // Ignore if there is no configured client/db

		const repoName = normalizeRepoName(className) as keyof RepositoryMap
		repos[repoName] = new (RepoClass as any)(dbClient)
	})

	return repos
}
