import { DatabaseClientsMap } from '@/infrastructure/databaseManager'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { randomBytes } from 'node:crypto'
import { Logger } from 'pino'
import { RedisClientType } from 'redis'
import { PasswordRecoveryTokenRepositoryInterface } from '../entities/PasswordRecoveryTokenRepositoryInterface'

/**
 * @class PasswordRecoveryTokenRepository
 * @description Implements PasswordRecoveryTokenRepositoryInterface for Redis,
 * managing password recovery tokens with expiration.
 *
 * Storage Pattern:
 * - `password_recovery:{token}` → userId (with TTL)
 * - `user_recovery_tokens:{userId}` → Set<token> (for bulk deletion)
 */
export class PasswordRecoveryTokenRepository implements PasswordRecoveryTokenRepositoryInterface {
	static name = 'passwordRecoveryToken' as const
	static provider: keyof DatabaseClientsMap = 'redis'

	// Redis key prefixes
	private static readonly TOKEN_KEY_PREFIX = 'password_recovery:'
	private static readonly USER_TOKENS_SET_PREFIX = 'user_recovery_tokens:'

	// Token configuration
	private static readonly TOKEN_LENGTH_BYTES = 32 // 256 bits

	private readonly logger: Logger

	constructor(
		readonly db: RedisClientType,
		container: DependencyContainer
	) {
		this.logger = container.logger
		this.logger.info('Repository initialized: passwordRecoveryToken')
	}

	private getTokenKey(token: string): string {
		return PasswordRecoveryTokenRepository.TOKEN_KEY_PREFIX + token
	}

	private getUserTokensSetKey(userId: string): string {
		return PasswordRecoveryTokenRepository.USER_TOKENS_SET_PREFIX + userId
	}

	/**
	 * Create a password recovery token for a user.
	 * Atomically stores the token mapping and adds to user's token set.
	 */
	async createToken(userId: string, expiresInSeconds: number): Promise<string> {
		const token = randomBytes(
			PasswordRecoveryTokenRepository.TOKEN_LENGTH_BYTES
		).toString('hex')

		const tokenKey = this.getTokenKey(token)
		const userTokensSetKey = this.getUserTokensSetKey(userId)

		// Atomic: add token to user set + store token mapping
		const result = await this.db
			.multi()
			.sAdd(userTokensSetKey, token)
			.setEx(tokenKey, expiresInSeconds, userId)
			.exec()

		const [sAddResult, setExResult] = result as unknown as [number, string]

		if (sAddResult && setExResult === 'OK') {
			this.logger.debug(
				{ userId, tokenLength: token.length },
				'Password recovery token created'
			)
			return token
		}

		throw new Error('Failed to create password recovery token')
	}

	/**
	 * Verify token and retrieve associated user ID.
	 * Does not delete the token; that's caller's responsibility.
	 */
	async verifyAndGetUserId(token: string): Promise<string | null> {
		const tokenKey = this.getTokenKey(token)
		const userId = await this.db.get(tokenKey)

		if (!userId) {
			this.logger.warn(
				{ tokenLength: token.length },
				'Invalid or expired recovery token'
			)
			return null
		}

		return userId
	}

	/**
	 * Delete a recovery token (enforces one-time use).
	 */
	async deleteToken(token: string): Promise<boolean> {
		const tokenKey = this.getTokenKey(token)

		// Get userId first to clean up the user's token set
		const userId = await this.db.get(tokenKey)

		if (!userId) {
			return false
		}

		const userTokensSetKey = this.getUserTokensSetKey(userId)

		// Atomic: delete token + remove from user set
		const result = await this.db
			.multi()
			.del(tokenKey)
			.sRem(userTokensSetKey, token)
			.exec()

		const [delResult, sRemResult] = result as unknown as [number, number]

		if (delResult === 1 && sRemResult === 1) {
			this.logger.debug(
				{ userId, tokenLength: token.length },
				'Password recovery token deleted'
			)
			return true
		}

		return false
	}

	/**
	 * Delete all recovery tokens for a user (e.g., after successful password reset).
	 * Cleans up both the token mappings and the user's token set.
	 */
	async deleteAllUserTokens(userId: string): Promise<number> {
		const userTokensSetKey = this.getUserTokensSetKey(userId)

		// Get all tokens for the user
		const tokens = await this.db.sMembers(userTokensSetKey)

		if (tokens.length === 0) {
			return 0
		}

		const pipeline = this.db.multi()
		pipeline.del(userTokensSetKey)

		// Delete each token mapping
		for (const token of tokens) {
			pipeline.del(this.getTokenKey(token))
		}

		await pipeline.exec()

		this.logger.debug(
			{ userId, tokensDeleted: tokens.length },
			'All password recovery tokens deleted for user'
		)

		return tokens.length
	}
}
