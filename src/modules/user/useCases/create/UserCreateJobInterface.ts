import { JobInterface } from '@/types/job/JobInterface'
import { UserCreateInput } from '../../entities/User' // Ruta relativa

/**
 * @interface UserCreateJobInterface
 * @description Defines the specific structure of the Job for the UserCreateUseCase.
 * It extends the base JobInterface to strongly type the expected input data for user creation.
 */
export interface UserCreateJobInterface extends JobInterface {
	/**
	 * Overrides the generic getData method to return the specific input for user creation.
	 * @returns {UserCreateInput} The user data required to create a new user.
	 */
	getData(): UserCreateInput
}
