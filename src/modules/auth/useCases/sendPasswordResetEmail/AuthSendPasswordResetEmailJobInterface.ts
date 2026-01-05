import { JobInterface } from '@/types/job/JobInterface'

/**
 * Job interface for sending password reset email
 */
export interface AuthSendPasswordResetEmailJobInterface extends JobInterface {
	getData(): {
		email: string
		name: string
		resetLink: string
		expiresIn: string
	}
}
