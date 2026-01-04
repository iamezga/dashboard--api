import { JobInterface } from '@/types/job/JobInterface'

export interface AuditGetJobInterface extends JobInterface {
	// Define getData return type
	getData(): {
		id: string
	}
}
