/**
 * @interface PasswordRecoveryTokenRepositoryInterface
 * @description Contract for password recovery token storage operations.
 *
 * Recovery tokens are temporary, one-time-use artifacts that allow
 * unauthenticated users to reset their password.
 *
 * Unlike sessions, recovery tokens:
 * - Are not tied to a session or membership
 * - Expire after 15 minutes
 * - Are deleted after use (one-time only)
 * - Store only userId (minimal metadata)
 */
export interface PasswordRecoveryTokenRepositoryInterface {
	/**
	 * Create a password recovery token for a user.
	 * @param userId User ID associated with the token
	 * @param expiresInSeconds Token expiration time in seconds
	 * @returns The generated recovery token
	 */
	createToken(userId: string, expiresInSeconds: number): Promise<string>

	/**
	 * Verify token existence and retrieve associated user ID.
	 * @param token The recovery token to verify
	 * @returns User ID if token is valid, null if invalid or expired
	 */
	verifyAndGetUserId(token: string): Promise<string | null>

	/**
	 * Delete a recovery token (one-time use enforcement).
	 * @param token The token to delete
	 * @returns True if token was deleted, false if it didn't exist
	 */
	deleteToken(token: string): Promise<boolean>

	/**
	 * Delete all recovery tokens for a user (e.g., after password reset).
	 * @param userId The user whose tokens should be deleted
	 * @returns Number of tokens deleted
	 */
	deleteAllUserTokens(userId: string): Promise<number>
}
