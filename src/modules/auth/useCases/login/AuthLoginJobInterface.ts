import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface AuthLoginJobInterface
 * @description Defines the specific structure of the Job for the AuthLoginUseCase.
 */
export interface AuthLoginJobInterface extends JobInterface {
	/**
	 * Overrides the generic getData method to return the specific input for login.
	 * @returns {{ email: string; password: string; organization: string }} The login credentials with organization slug.
	 */
	getData(): {
		email: string
		password: string
		organization: string
	}
}
