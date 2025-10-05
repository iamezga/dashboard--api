// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Locals, Request } from 'express'
import { JobInterface } from './job/JobInterface'
import { JobMetaInterface } from './job/JobMetaInterface'
import { UseCaseResponseInterface } from './useCase/UseCaseResponseInterface'

export interface RequestData {
	payload?: Record<string, any>
	recaptchaResponse?: string
	token?: string
	id: string
	attempts: number
	meta: JobMetaInterface
}

declare global {
	namespace Express {
		interface Request {
			requestData: RequestData
		}
		interface Locals {
			job: JobInterface
			useCaseResponse?: UseCaseResponseInterface
		}
	}
}
