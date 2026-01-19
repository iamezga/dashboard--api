import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface UserUpdateSelfJobInterface
 * @description Defines the specific structure of the Job for the UserUpdateSelfUseCase.
 * It extends the base JobInterface to strongly type the expected input data for self profile update.
 *
 * IMPORTANT: This interface does NOT include roleId or active fields, as users cannot
 * modify these sensitive fields on their own profile.
 */
export interface UserUpdateSelfJobInterface extends JobInterface {
	/**
	 * Overrides the generic getData method to return the specific input for self profile update.
	 * @returns {UserUpdateSelfInput} The user data required to update own profile.
	 */
	getData(): {
		name?: string
		surname?: string
		email?: string
		config?: Record<string, any>
	}
}
