import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface AuthLogoutJobInterface
 * @description Job interface for logout use case.
 * The sessionId is extracted from the authenticated user's token.
 */
export interface AuthLogoutJobInterface extends JobInterface {
	/**
	 * Returns empty data object as sessionId comes from authenticated user context
	 * @returns {{}} Empty object
	 */
	getData(): Record<string, never>
}
