import { JobMetaInterface } from './job/JobMetaInterface'

export interface RequestData {
	id: string
	token: string | undefined
	attempts: number
	meta: JobMetaInterface
}
