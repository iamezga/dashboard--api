import { SessionData } from './Session'

/**
 * @interface SessionRepositoryInterface
 * @description Defines the contract for session data access operations using Redis.
 * It provides methods to create, retrieve, update, and delete user session data.
 */
export interface SessionRepositoryInterface {
	readonly name?: 'SessionRepository'

	/**
	 * Creates or updates a user's session data in Redis.
	 * @param {string} sessionId - The unique ID of the session (e.g., userId).
	 * @param {SessionData} data - The session data to store.
	 * @param {number} expiresInSeconds - Time-to-live (TTL) for the session in seconds.
	 * @returns {Promise<boolean>} True if the session was saved successfully, false otherwise.
	 */
	save(
		sessionId: string,
		data: SessionData,
		expiresInSeconds: number
	): Promise<boolean>

	/**
	 * Retrieves a user's session data from Redis.
	 * @param {string} sessionId - The unique ID of the session.
	 * @returns {Promise<SessionData | null>} The session data or null if not found.
	 */
	findById(sessionId: string): Promise<SessionData | null>

	/**
	 * Deletes a user's session data from Redis.
	 * @param {string} sessionId - The unique ID of the session to delete.
	 * @returns {Promise<boolean>} True if the session was deleted, false otherwise.
	 */
	delete(sessionId: string): Promise<boolean>

	/**
	 * Updates the 'lastActivity' timestamp of a session and refreshes its TTL if applicable.
	 * @param {string} sessionId - The unique ID of the session.
	 * @param {number} expiresInSeconds - Time-to-live (TTL) for the session in seconds.
	 * @returns {Promise<boolean>} True if updated, false if session not found.
	 */
	updateLastActivity(
		sessionId: string,
		expiresInSeconds: number
	): Promise<boolean>
}
