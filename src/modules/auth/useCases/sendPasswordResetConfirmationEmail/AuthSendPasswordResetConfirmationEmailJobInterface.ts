import { JobInterface } from '@/types/job/JobInterface'

/**
 * Job interface for sending password reset confirmation email
 */
export interface AuthSendPasswordResetConfirmationEmailJobInterface
	extends JobInterface {
	getData(): {
		email: string
		name: string
	}
}
