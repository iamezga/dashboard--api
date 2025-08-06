import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseResponseInterface } from './UseCaseResponseInterface'

export interface UseCaseInterface<J extends JobInterface = JobInterface> {
	run: (job: J) => Promise<UseCaseResponseInterface>
}
