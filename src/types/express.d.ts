// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from 'express'

interface RequestData {
	[key: string]: any
	id: string
	timestamp: Date
	payload?: Record<string, any>
	recaptchaResponse?: string
	metadata: {
		method: string
		url: string
		ip?: string
		userAgent?: string
		referer?: string
		origin?: string
	}
}

declare global {
	namespace Express {
		interface Request {
			requestData: RequestData
		}
	}
}
