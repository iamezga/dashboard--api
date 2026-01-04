import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface PasswordResetJobInterface
 * @description Job interface for resetting user password with valid token.
 * Receives token and new password to complete the recovery process.
 */
export interface AuthPasswordResetJobInterface extends JobInterface {
	/**
	 * Returns the token and new password for password reset.
	 * @returns {{token: string, password: string}} Recovery token and new password.
	 */
	getData(): {
		token: string
		password: string
	}
}
