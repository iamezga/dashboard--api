import { repositories, RepositoryMap } from '@/modules/repositories'
import { ConnectedDatabases } from './databaseServiceManager'

export const DB_PREFIXES = ['Postgres', 'Mongo', 'Redis'] as const
type DBType = Lowercase<(typeof DB_PREFIXES)[number]>

export const DB_CLIENT_MAP: Record<DBType, keyof ConnectedDatabases> = {
	postgres: 'prisma',
	mongo: 'mongo',
	redis: 'redis'
} as const

/** Convert "PostgresUserRepository" → "userRepository" */
export function normalizeRepoName(className: string) {
	const prefix = DB_PREFIXES.find(p => className.startsWith(p))
	if (!prefix) throw new Error(`DB prefix not supported in ${className}`)
	const baseName = className.replace(prefix, '')
	return baseName.charAt(0).toLowerCase() + baseName.slice(1)
}

/** Detects the type of DB from the name of the class */
export function detectDBType(className: string): DBType {
	const prefix = DB_PREFIXES.find(p => className.startsWith(p))
	if (!prefix) throw new Error(`DB could not be detected in ${className}`)
	return prefix.toLowerCase() as DBType
}

/**
 * Dynamically instantiates and registers all repository classes in the project.
 *
 * This loader detects the database type each repository is designed for
 * based on its class name (e.g., `PostgresUserRepository`, `MongoOrderRepository`)
 * and automatically injects the corresponding connected database client.
 *
 * Purpose:
 * - Centralize repository instantiation so that repositories do not need to
 *   manually manage or request database clients.
 * - Allow the application to support multiple database engines at the same time.
 * - Enable easy database migrations without modifying business logic or use cases.
 *
 * How it works:
 * 1. Reads all repository classes exported in `modules/repositories.ts`.
 * 2. Determines the database type from the class name prefix (e.g., `Postgres`, `Mongo`, `Redis`).
 * 3. Checks if there is an active client for that database in the provided `clients` object.
 * 4. If a client exists, instantiates the repository with that client.
 * 5. Registers the repository instance in a `RepositoryMap` for application-wide access.
 *
 * Benefits:
 * - Adding a new repository is as simple as creating a class that follows the
 *   naming convention and exporting it from `modules/repositories.ts`.
 * - Repositories automatically get the right database client without manual wiring.
 * - Switching or removing databases only requires changes to the database connection
 *   configuration, not in repository or use case code.
 *
 * Example:
 *  If you add a `MongoProductRepository` class and export it from `modules/repositories.ts`,
 *  this loader will automatically detect it and inject the active MongoDB client.
 *
 * @param {ConnectedDatabases} clients
 *   Active database clients available for injection into repositories.
 * @returns {RepositoryMap}
 *   A map of repository names to their instantiated objects.
 */
export function loadRepositories(clients: ConnectedDatabases): RepositoryMap {
	const repos = {} as RepositoryMap

	Object.entries(repositories).forEach(([className, RepoClass]) => {
		const repoDB = detectDBType(className)
		const clientKey = DB_CLIENT_MAP[repoDB]
		const dbClient = clients[clientKey]

		if (!dbClient) return // Ignore if there is no configured client/db

		const repoName = normalizeRepoName(className) as keyof RepositoryMap
		repos[repoName] = new (RepoClass as any)(dbClient)
	})

	return repos
}
