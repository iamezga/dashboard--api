import { JobInterface } from '@/types/job/JobInterface'

export interface ExampleGetJobInterface extends JobInterface {
	// Define getData return type
	getData(): {
		foo: string
		bar: string
	}
}
