// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Request } from 'express'

interface RequestData {
	id: string
	method: string
	url: string
	timestamp: Date
	ip?: string
	userAgent?: string
	referer?: string
	origin?: string
}

declare global {
	namespace Express {
		interface Request {
			requestData: RequestData
		}
	}
}
