import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface PasswordRecoveryRequestJobInterface
 * @description Job interface for password recovery request use case.
 * Receives the user's email to initiate the password recovery process.
 */
export interface AuthPasswordRecoveryRequestJobInterface extends JobInterface {
	/**
	 * Returns the email for password recovery request.
	 * @returns {{email: string}} The email address to send the recovery link to.
	 */
	getData(): {
		email: string
	}
}
