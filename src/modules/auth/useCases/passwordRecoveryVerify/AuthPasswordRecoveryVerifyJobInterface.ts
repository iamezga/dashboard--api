import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface PasswordRecoveryVerifyJobInterface
 * @description Job interface for verifying password recovery token.
 * Validates that the token exists and hasn't expired.
 */
export interface AuthPasswordRecoveryVerifyJobInterface extends JobInterface {
	/**
	 * Returns the recovery token to verify.
	 * @returns {{token: string}} The recovery token from email link.
	 */
	getData(): {
		token: string
	}
}
