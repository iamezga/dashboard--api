import { JobInterface } from '@/types/job/JobInterface'

/**
 * @interface UserSendWelcomeEmailJobInterface
 * @description Defines the specific structure of the Job for the UserSendWelcomeEmailUseCase.
 */
export interface UserSendWelcomeEmailJobInterface extends JobInterface {
	getData(): {
		email: string
		name: string
	}
}
