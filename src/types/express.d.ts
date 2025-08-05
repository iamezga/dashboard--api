// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from 'express'
import { JobMetaInterface } from './job/JobMetaInterface'

interface RequestData {
	payload?: Record<string, any>
	recaptchaResponse?: string
	id: string
	attempts: number
	meta: JobMetaInterface
}

declare global {
	namespace Express {
		interface Request {
			requestData: RequestData
		}
	}
}
