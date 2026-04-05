import {
	SessionContext,
	SessionMetadata,
	SessionMetadataInput
} from './Session'

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
	createSession(
		userId: string,
		metadata: SessionMetadataInput,
		context: SessionContext,
		expiresInSeconds: number
	): Promise<string | null>

	getSessionMetadata(sessionId: string): Promise<SessionMetadata | null>

	getSessionContext(sessionId: string): Promise<SessionContext | null>

	updateSessionContext(
		sessionId: string,
		context: SessionContext,
		expiresInSeconds: number
	): Promise<boolean>

	getUserSessionIds(userId: string): Promise<string[]>

	hasActiveSessions(userId: string): Promise<boolean>

	deleteSession(sessionId: string): Promise<boolean>

	deleteAllUserSessions(userId: string): Promise<void>

	updateLastActivity(
		sessionId: string,
		expiresInSeconds: number
	): Promise<boolean>
}
