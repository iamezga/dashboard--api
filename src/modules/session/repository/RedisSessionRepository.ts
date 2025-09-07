import { RedisClientType } from 'redis'
import { SessionData } from '../entities/Session'
import { SessionRepositoryInterface } from '../entities/SessionRepositoryInterface'

/**
 * @class RedisSessionRepository
 * @description Implements SessionRepositoryInterface for Redis.
 * Handles the storage, retrieval, and management of user session data in Redis,
 * including merged permissions and activity tracking.
 */
export class RedisSessionRepository implements SessionRepositoryInterface {
	constructor(readonly db: RedisClientType) {}

	/**
	 * Converts SessionData to a format suitable for storage in Redis (JSON string).
	 * @param {SessionData} data - The session data object.
	 * @returns {string} JSON string representation.
	 */
	private serializeSessionData(data: SessionData): string {
		return JSON.stringify(data)
	}

	/**
	 * Parses a JSON string from Redis back into a SessionData object.
	 * @param {string | null} dataString - The JSON string from Redis.
	 * @returns {SessionData | null} The parsed session data object or null.
	 */
	private deserializeSessionData(
		dataString: string | null
	): SessionData | null {
		if (!dataString) return null
		try {
			return JSON.parse(dataString) as SessionData
		} catch (error) {
			console.error('Failed to parse session data from Redis:', error)
			return null
		}
	}

	/**
	 * Saves session data to Redis with a TTL.
	 * @param {string} sessionId - The user's ID, used as the Redis key.
	 * @param {SessionData} data - The session data object.
	 * @param {number} expiresInSeconds - Time-to-live for the key in seconds.
	 * @returns {Promise<boolean>}
	 */
	async save(
		sessionId: string,
		data: SessionData,
		expiresInSeconds: number
	): Promise<boolean> {
		const key = `session:${sessionId}` // Prefix for session keys
		const serializedData = this.serializeSessionData(data)
		const result = await this.db.set(key, serializedData, {
			EX: expiresInSeconds
		})
		return result === 'OK'
	}

	/**
	 * Retrieves session data from Redis.
	 * @param {string} sessionId - The user's ID, used as the Redis key.
	 * @returns {Promise<SessionData | null>}
	 */
	async findById(sessionId: string): Promise<SessionData | null> {
		const key = `session:${sessionId}`
		const dataString = await this.db.get(key)
		return this.deserializeSessionData(dataString)
	}

	/**
	 * Deletes session data from Redis.
	 * @param {string} sessionId - The user's ID, used as the Redis key.
	 * @returns {Promise<boolean>}
	 */
	async delete(sessionId: string): Promise<boolean> {
		const key = `session:${sessionId}`
		const result = await this.db.del(key)
		return result === 1 // 'del' returns the number of keys deleted
	}

	/**
	 * Updates the 'lastActivity' timestamp of a session and refreshes its TTL.
	 * @param {string} sessionId - The unique ID of the session.
	 * @param {number} expiresInSeconds - New TTL for the session in seconds.
	 * @returns {Promise<boolean>} True if updated, false if session not found or update failed.
	 */
	async updateLastActivity(
		sessionId: string,
		expiresInSeconds: number
	): Promise<boolean> {
		const key = `session:${sessionId}`
		const dataString = await this.db.get(key)
		if (!dataString) return false

		const sessionData = this.deserializeSessionData(dataString)
		if (!sessionData) return false

		sessionData.lastActivity = Date.now() // Update the last activity
		const serializedData = this.serializeSessionData(sessionData)

		// Update the value and cool the TTL
		// The set command with EX refreshes both, the value and the TTL.
		const result = await this.db.set(key, serializedData, {
			EX: expiresInSeconds
		})
		return result === 'OK'
	}
}
