import { JobInterface } from '@/types/job/JobInterface'

export interface UserGetJobInterface extends JobInterface {
	// Define getData return type
	getData(): {
		id: string
	}
}
