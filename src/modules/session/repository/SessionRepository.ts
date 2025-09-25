import { DependencyContainer } from '@/core/dependencyContainer'
import { RepositoryManager } from '@/core/repositoryManager'
import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { randomUUID } from 'node:crypto'
import { Logger } from 'pino'
import { RedisClientType } from 'redis'
import { SessionData, SessionDataInput, SessionUser } from '../entities/Session'
import { SessionRepositoryInterface } from '../entities/SessionRepositoryInterface'

type SessionRepositoryContext = {
	repositoryManager: RepositoryManager
	logger: Logger
}

/**
 * @class SessionRepository
 * @description Implements SessionRepositoryInterface for Redis, managing user data
 * and multiple concurrent sessions.
 */
export class SessionRepository implements SessionRepositoryInterface {
	static name = 'session' as const
	static provider: keyof DatabaseClientsMap = 'redis'
	private context!: SessionRepositoryContext
	// Key prefixes for different data types in Redis
	private static readonly USER_DATA_KEY_PREFIX = 'user:data:'
	private static readonly SESSION_METADATA_KEY_PREFIX = 'session:metadata:'
	private static readonly USER_SESSIONS_SET_KEY_PREFIX = 'user:sessions:'

	constructor(readonly db: RedisClientType) {}

	/**
	 * Injects the dependency container into the repository instance.
	 * This allows the repository to access other services or repositories from the container.
	 * @param {DependencyContainer} container - The main dependency container.
	 */
	setContext(container: DependencyContainer): void {
		const { repositoryManager, logger } = container
		this.context = {
			repositoryManager,
			logger
		}
		this.context.logger.info(`Repository context ready.`)
	}

	/**
	 * Serializes a data object to a JSON string for Redis storage.
	 * @param data - The data to serialize.
	 * @returns The JSON string.
	 */
	private serialize<T>(data: T): string {
		return JSON.stringify(data)
	}

	/**
	 * Deserializes a JSON string from Redis back to an object.
	 * @param dataString - The JSON string to deserialize.
	 * @returns The deserialized object or null on failure.
	 */
	private deserialize<T>(dataString: string | null): T | null {
		if (!dataString) return null
		try {
			return JSON.parse(dataString) as T
		} catch (error) {
			this.context.logger.error('Failed to parse data from Redis:', error)
			return null
		}
	}

	/**
	 * Saves user's merged permissions and a snapshot of their data.
	 * @param userId - The user's unique ID.
	 * @param data - The user's permissions and data snapshot.
	 * @param expiresInSeconds - Time-to-live for the user's data key.
	 * @returns True if the data was saved successfully, false otherwise.
	 */
	async saveUserData(
		userId: string,
		data: SessionUser,
		expiresInSeconds: number
	): Promise<boolean> {
		const key = SessionRepository.USER_DATA_KEY_PREFIX + userId
		const serializedData = this.serialize(data)
		const result = await this.db.set(key, serializedData, {
			EX: expiresInSeconds
		})
		return result === 'OK'
	}

	/**
	 * Retrieves the user's merged permissions and data snapshot.
	 * @param userId - The user's unique ID.
	 * @returns The user data, or null if not found.
	 */
	async getUserData(userId: string): Promise<SessionUser | null> {
		const key = SessionRepository.USER_DATA_KEY_PREFIX + userId
		const dataString = await this.db.get(key)
		return this.deserialize<SessionUser>(dataString)
	}

	/**
	 * Creates a new unique session entry for a user, adding it to the user's
	 * list of active sessions.
	 * @param userId - The unique ID of the user.
	 * @param data - The session metadata to store.
	 * @param expiresInSeconds - Time-to-live for the session in seconds.
	 * @returns The new unique sessionId or null on failure.
	 */
	async createSession(
		userId: string,
		data: SessionDataInput,
		expiresInSeconds: number
	): Promise<string | null> {
		const sessionId = randomUUID()
		const sessionMetadataKey =
			SessionRepository.SESSION_METADATA_KEY_PREFIX + sessionId
		const userSessionsKey =
			SessionRepository.USER_SESSIONS_SET_KEY_PREFIX + userId

		const sessionData: SessionData = {
			...data,
			sessionId
		}

		const serializedData = this.serialize(sessionData)

		// Use a transaction to ensure both operations succeed or fail together.
		const result = await this.db
			.multi()
			.sAdd(userSessionsKey, sessionId)
			.set(sessionMetadataKey, serializedData, { EX: expiresInSeconds })
			.exec()

		const [sAddResult, setResult] = result as unknown as [number, string]

		if (sAddResult === 1 && setResult === 'OK') {
			return sessionId
		}

		return null
	}

	/**
	 * Retrieves all active session IDs for a given user.
	 * @param userId - The unique ID of the user.
	 * @returns An array of session IDs.
	 */
	async getUserSessionIds(userId: string): Promise<string[]> {
		const key = SessionRepository.USER_SESSIONS_SET_KEY_PREFIX + userId
		return this.db.sMembers(key)
	}

	/**
	 * Retrieves the metadata for a specific session.
	 * @param sessionId - The unique ID of the session.
	 * @returns The session metadata or null if not found.
	 */
	async getSessionMetadata(sessionId: string): Promise<SessionData | null> {
		const key = SessionRepository.SESSION_METADATA_KEY_PREFIX + sessionId
		const dataString = await this.db.get(key)
		return this.deserialize<SessionData>(dataString)
	}

	/**
	 * Checks if a user has any active sessions.
	 * @param userId - The user's unique ID.
	 * @returns True if the user has one or more active sessions, false otherwise.
	 */
	async hasActiveSessions(userId: string): Promise<boolean> {
		const key = SessionRepository.USER_SESSIONS_SET_KEY_PREFIX + userId
		const count = await this.db.sCard(key)
		return count > 0
	}

	/**
	 * Deletes a specific session entry and removes it from the user's list of sessions.
	 * @param sessionId - The unique ID of the session to delete.
	 * @returns True if the session was deleted, false otherwise.
	 */
	async deleteSession(sessionId: string): Promise<boolean> {
		// Need to find userId first to remove from the SET
		const sessionMetadata = await this.getSessionMetadata(sessionId)
		if (!sessionMetadata) {
			return false
		}
		const { userId } = sessionMetadata
		const userSessionsKey =
			SessionRepository.USER_SESSIONS_SET_KEY_PREFIX + userId
		const sessionMetadataKey =
			SessionRepository.SESSION_METADATA_KEY_PREFIX + sessionId

		// Use a transaction for atomicity
		const result = await this.db
			.multi()
			.del(sessionMetadataKey)
			.sRem(userSessionsKey, sessionId)
			.exec()

		// Check if both operations were successful
		const [delResult, sRemResult] = result as unknown as [number, number]
		return delResult === 1 && sRemResult === 1
	}

	/**
	 * Deletes all active sessions for a user, as well as their main user data.
	 * @param userId - The unique ID of the user.
	 * @returns Promise<void>
	 */
	async deleteAllUserSessions(userId: string): Promise<void> {
		const userSessionsKey =
			SessionRepository.USER_SESSIONS_SET_KEY_PREFIX + userId
		const userDataKey = SessionRepository.USER_DATA_KEY_PREFIX + userId

		// Get all session IDs for the user
		const sessionIds = await this.db.sMembers(userSessionsKey)
		if (sessionIds.length === 0) return

		// Use a transaction to delete all related keys
		const pipeline = this.db.multi()
		pipeline.del(userDataKey)
		pipeline.del(userSessionsKey)
		for (const sessionId of sessionIds) {
			pipeline.del(SessionRepository.SESSION_METADATA_KEY_PREFIX + sessionId)
		}
		await pipeline.exec()
	}

	/**
	 * Updates the 'lastActivity' timestamp of a session and refreshes its TTL.
	 * @param sessionId - The unique ID of the session.
	 * @param expiresInSeconds - New TTL for the session in seconds.
	 * @returns True if updated, false if session not found or update failed.
	 */
	async updateLastActivity(
		sessionId: string,
		expiresInSeconds: number
	): Promise<boolean> {
		const key = SessionRepository.SESSION_METADATA_KEY_PREFIX + sessionId
		const dataString = await this.db.get(key)
		if (!dataString) return false

		const sessionData = this.deserialize<SessionData>(dataString)
		if (!sessionData) return false

		sessionData.lastActivity = Date.now()
		const serializedData = this.serialize(sessionData)

		const result = await this.db.set(key, serializedData, {
			EX: expiresInSeconds
		})

		return result === 'OK'
	}
}
