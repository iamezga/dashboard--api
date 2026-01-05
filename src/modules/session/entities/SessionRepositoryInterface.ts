import { SessionData, SessionDataInput, SessionUser } from './Session'

/**
 * @interface SessionRepositoryInterface
 * @description Defines the contract for session data access operations using Redis.
 * Manages user sessions and authentication state with automatic expiration.
 *
 * Sessions store active user authentication state including user data, permissions,
 * and metadata. They enable stateful authentication with Redis as the backing store
 * for fast lookups and automatic expiration. Supports storing both user-level data
 * (shared across sessions) and session-specific metadata.
 */
export interface SessionRepositoryInterface {
	/**
	 * Creates or updates a user's data and permissions snapshot.
	 * This key is separate from individual sessions and should be updated
	 * only when the user's permissions or core data change.
	 * @param {string} userId - The user's unique ID.
	 * @param {SessionUser} data - The user's permissions and data snapshot.
	 * @param {number} expiresInSeconds - Time-to-live for the user's data key.
	 * @returns {Promise<boolean>} True if the data was saved, false otherwise.
	 */
	saveUserData(
		userId: string,
		data: SessionUser,
		expiresInSeconds: number
	): Promise<boolean>

	/**
	 * Retrieves the user's data and permissions snapshot.
	 * @param {string} userId - The user's unique ID.
	 * @returns {Promise<SessionUser | null>} The user data, or null if not found.
	 */
	getUserData(userId: string): Promise<SessionUser | null>

	/**
	 * Creates a new unique session entry for a user, adding it to the user's
	 * list of active sessions.
	 * @param {string} userId - The unique ID of the user.
	 * @param {Omit<SessionData, 'sessionId'>} data - Session data without sessionId
	 * @param {number} expiresInSeconds - Time-to-live (TTL) for the session in seconds.
	 * @returns {Promise<string | null>} The new unique sessionId or null on failure.
	 */
	createSession(
		userId: string,
		data: SessionDataInput,
		expiresInSeconds: number
	): Promise<string | null>

	/**
	 * Retrieves all active session IDs for a given user.
	 * @param {string} userId - The unique ID of the user.
	 * @returns {Promise<string[]>} An array of session IDs.
	 */
	getUserSessionIds(userId: string): Promise<string[]>

	/**
	 * Retrieves the metadata for a specific session.
	 * @param {string} sessionId - The unique ID of the session.
	 * @returns {Promise<SessionData | null>} The session metadata or null if not found.
	 */
	getSessionMetadata(sessionId: string): Promise<SessionData | null>

	/**
	 * Checks if a user has any active sessions.
	 * @param {string} userId - The user's unique ID.
	 * @returns {Promise<boolean>} True if the user has one or more active sessions, false otherwise.
	 */
	hasActiveSessions(userId: string): Promise<boolean>

	/**
	 * Deletes a specific session entry and removes it from the user's list of sessions.
	 * @param {string} sessionId - The unique ID of the session to delete.
	 * @returns {Promise<boolean>} True if the session was deleted, false otherwise.
	 */
	deleteSession(sessionId: string): Promise<boolean>

	/**
	 * Deletes all active sessions for a user, as well as their main user data.
	 * @param {string} userId - The unique ID of the user.
	 * @returns {Promise<void>}
	 */
	deleteAllUserSessions(userId: string): Promise<void>

	/**
	 * Updates the 'lastActivity' timestamp of a session and refreshes its TTL.
	 * @param {string} sessionId - The unique ID of the session.
	 * @param {number} expiresInSeconds - New TTL for the session in seconds.
	 * @returns {Promise<boolean>} True if updated, false if session not found or update failed.
	 */
	updateLastActivity(
		sessionId: string,
		expiresInSeconds: number
	): Promise<boolean>
}
