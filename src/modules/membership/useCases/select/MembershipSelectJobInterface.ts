import { JobInterface } from '@/types/job/JobInterface'

export interface MembershipSelectJobInterface extends JobInterface {
	// Define getData return type
	getData(): {
		id: string
	}
}
