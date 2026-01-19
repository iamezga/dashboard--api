import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface UserUpdateJobInterface
 * @description Defines the specific structure of the Job for the UserUpdateUseCase.
 * It extends the base JobInterface to strongly type the expected input data for user update.
 */
export interface UserUpdateJobInterface extends JobInterface {
	/**
	 * Overrides the generic getData method to return the specific input for user update.
	 * @returns {UserUpdateInput} The user data required to update an existing user.
	 */
	getData(): {
		id: string
		name?: string
		surname?: string
		email?: string
		active?: boolean
		roleId?: string
		config?: Record<string, any>
	}
}
