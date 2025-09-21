import { JobMetaInterface } from './job/JobMetaInterface'

export interface RequestData {
	payload?: Record<string, any>
	recaptchaResponse?: string
	token?: string
	id: string
	attempts: number
	meta: JobMetaInterface
}
