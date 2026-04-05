import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { randomUUID } from 'node:crypto'
import { Logger } from 'pino'
import { RedisClientType } from 'redis'
import {
	SessionContext,
	SessionMetadata,
	SessionMetadataInput
} from '../entities/Session'
import { SessionRepositoryInterface } from '../entities/SessionRepositoryInterface'

/**
 * @class SessionRepository
 * @description Implements SessionRepositoryInterface for Redis, managing
 * session metadata and session context per sessionId, plus user session indexes.
 */
export class SessionRepository implements SessionRepositoryInterface {
	static name = 'session' as const
	static provider: keyof DatabaseClientsMap = 'redis'

	// Redis key prefixes
	private static readonly SESSION_CONTEXT_KEY_PREFIX = 'session:context:'
	private static readonly SESSION_METADATA_KEY_PREFIX = 'session:metadata:'
	private static readonly USER_SESSIONS_SET_KEY_PREFIX = 'user:sessions:'

	private readonly logger: Logger

	constructor(
		readonly db: RedisClientType,
		container: DependencyContainer
	) {
		this.logger = container.logger
		this.logger.info('Repository initialized: session')
	}

	/**
	 * Serializes data to a JSON string for storage in Redis.
	 * @param data The data to serialize
	 * @returns The serialized JSON string
	 */
	private serialize<T>(data: T): string {
		return JSON.stringify(data)
	}

	/**
	 * Deserializes a JSON string from Redis into a JavaScript object.
	 * @param dataString The JSON string to deserialize
	 * @returns The deserialized object, or null if parsing fails
	 */
	private deserialize<T>(dataString: string | null): T | null {
		if (!dataString) return null
		try {
			return JSON.parse(dataString) as T
		} catch (error: any) {
			this.logger.error('Failed to parse data from Redis:', error)
			return null
		}
	}
	/**
	 * Generates the Redis key for storing session metadata.
	 * @param sessionId The session ID
	 * @returns The Redis key for session metadata
	 */
	private getSessionMetadataKey(sessionId: string): string {
		return SessionRepository.SESSION_METADATA_KEY_PREFIX + sessionId
	}

	/**
	 * Generates the Redis key for storing session context.
	 * @param sessionId The session ID
	 * @returns The Redis key for session context
	 */
	private getSessionContextKey(sessionId: string): string {
		return SessionRepository.SESSION_CONTEXT_KEY_PREFIX + sessionId
	}

	/**
	 * Generates the Redis key for storing user session indexes.
	 * @param userId The user ID
	 * @returns The Redis key for user session indexes
	 */
	private getUserSessionsKey(userId: string): string {
		return SessionRepository.USER_SESSIONS_SET_KEY_PREFIX + userId
	}

	/**
	 * Creates a new session for a user, storing metadata and context in Redis.
	 * @param userId The user ID
	 * @param metadata The session metadata
	 * @param context The session context
	 * @param expiresInSeconds The session expiration time in seconds
	 * @returns The session ID if creation is successful, otherwise null
	 */
	async createSession(
		userId: string,
		metadata: SessionMetadataInput,
		context: SessionContext,
		expiresInSeconds: number
	): Promise<string | null> {
		const sessionId = randomUUID()
		const sessionMetadataKey = this.getSessionMetadataKey(sessionId)
		const sessionContextKey = this.getSessionContextKey(sessionId)
		const userSessionsKey = this.getUserSessionsKey(userId)

		const sessionMetadata: SessionMetadata = {
			...metadata,
			sessionId
		}

		const serializedMetadata = this.serialize(sessionMetadata)
		const serializedContext = this.serialize(context)

		// Atomic write for user index + metadata + context
		const result = await this.db
			.multi()
			.sAdd(userSessionsKey, sessionId)
			.set(sessionMetadataKey, serializedMetadata, { EX: expiresInSeconds })
			.set(sessionContextKey, serializedContext, { EX: expiresInSeconds })
			.exec()

		const [sAddResult, setMetadataResult, setContextResult] =
			result as unknown as [number, string, string]

		if (
			sAddResult === 1 &&
			setMetadataResult === 'OK' &&
			setContextResult === 'OK'
		) {
			return sessionId
		}

		return null
	}

	/**
	 * Retrieves the metadata for a specific session.
	 * @param sessionId The session ID
	 * @returns The session metadata, or null if not found
	 */
	async getSessionMetadata(sessionId: string): Promise<SessionMetadata | null> {
		const key = this.getSessionMetadataKey(sessionId)
		const dataString = await this.db.get(key)
		return this.deserialize<SessionMetadata>(dataString)
	}

	/**
	 * Retrieves the context for a specific session.
	 * @param sessionId The session ID
	 * @returns The session context, or null if not found
	 */
	async getSessionContext(sessionId: string): Promise<SessionContext | null> {
		const key = this.getSessionContextKey(sessionId)
		const dataString = await this.db.get(key)
		return this.deserialize<SessionContext>(dataString)
	}

	/**
	 * Updates the context for a specific session.
	 * @param sessionId The session ID
	 * @param context The new session context
	 * @param expiresInSeconds The session expiration time in seconds
	 * @returns True if the update is successful, otherwise false
	 */
	async updateSessionContext(
		sessionId: string,
		context: SessionContext,
		expiresInSeconds: number
	): Promise<boolean> {
		const key = this.getSessionContextKey(sessionId)
		const serializedContext = this.serialize(context)

		const result = await this.db.set(key, serializedContext, {
			EX: expiresInSeconds
		})

		return result === 'OK'
	}

	/**
	 * Retrieves the session IDs for a specific user.
	 * @param userId The user ID
	 * @returns An array of session IDs
	 */
	async getUserSessionIds(userId: string): Promise<string[]> {
		const key = this.getUserSessionsKey(userId)
		return this.db.sMembers(key)
	}

	/**
	 * Checks if a user has any active sessions.
	 * @param userId The user ID
	 * @returns True if the user has active sessions, otherwise false
	 */
	async hasActiveSessions(userId: string): Promise<boolean> {
		const key = this.getUserSessionsKey(userId)
		const count = await this.db.sCard(key)
		return count > 0
	}

	/**
	 * Deletes a specific session.
	 * @param sessionId The session ID
	 * @returns True if the session was deleted, otherwise false
	 */
	async deleteSession(sessionId: string): Promise<boolean> {
		const sessionMetadata = await this.getSessionMetadata(sessionId)
		if (!sessionMetadata) {
			return false
		}

		const userSessionsKey = this.getUserSessionsKey(sessionMetadata.userId)
		const sessionMetadataKey = this.getSessionMetadataKey(sessionId)
		const sessionContextKey = this.getSessionContextKey(sessionId)

		// Delete metadata/context and unlink session from user index
		const result = await this.db
			.multi()
			.del(sessionMetadataKey)
			.del(sessionContextKey)
			.sRem(userSessionsKey, sessionId)
			.exec()

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [delMetadataResult, _delContextResult, sRemResult] =
			result as unknown as [number, number, number]

		return delMetadataResult === 1 && sRemResult === 1 // Context deletion is best-effort, so we don't check its result
	}

	/**
	 * Deletes all sessions for a specific user.
	 * @param userId The user ID
	 */
	async deleteAllUserSessions(userId: string): Promise<void> {
		const userSessionsKey = this.getUserSessionsKey(userId)
		const sessionIds = await this.db.sMembers(userSessionsKey)

		if (sessionIds.length === 0) return

		const pipeline = this.db.multi()
		pipeline.del(userSessionsKey)

		for (const sessionId of sessionIds) {
			pipeline.del(this.getSessionMetadataKey(sessionId))
			pipeline.del(this.getSessionContextKey(sessionId))
		}

		await pipeline.exec()
	}

	/**
	 * Updates the last activity timestamp for a specific session.
	 * @param sessionId The session ID
	 * @param expiresInSeconds The session expiration time in seconds
	 * @returns True if the update is successful, otherwise false
	 */
	async updateLastActivity(
		sessionId: string,
		expiresInSeconds: number
	): Promise<boolean> {
		const sessionMetadataKey = this.getSessionMetadataKey(sessionId)
		const sessionContextKey = this.getSessionContextKey(sessionId)
		const dataString = await this.db.get(sessionMetadataKey)
		if (!dataString) return false

		const sessionMetadata = this.deserialize<SessionMetadata>(dataString)
		if (!sessionMetadata) return false

		sessionMetadata.lastActivity = Date.now()
		const serializedMetadata = this.serialize(sessionMetadata)

		// Keep metadata and context TTL in sync
		const result = await this.db
			.multi()
			.set(sessionMetadataKey, serializedMetadata, { EX: expiresInSeconds })
			.expire(sessionContextKey, expiresInSeconds)
			.exec()

		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const [setMetadataResult, _expireContextResult] = result as unknown as [
			string,
			number
		]

		return setMetadataResult === 'OK'
	}
}
