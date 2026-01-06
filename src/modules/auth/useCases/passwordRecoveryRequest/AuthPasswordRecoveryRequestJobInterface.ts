import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface PasswordRecoveryRequestJobInterface
 * @description Job interface for password recovery request use case.
 * Receives the user's email and organization slug to initiate the password recovery process.
 */
export interface AuthPasswordRecoveryRequestJobInterface extends JobInterface {
	/**
	 * Returns the email and organization for password recovery request.
	 * @returns {{email: string; organization: string}} The email address and organization slug.
	 */
	getData(): {
		email: string
		organization: string
	}
}
