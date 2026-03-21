// eslint-disable-next-line @typescript-eslint/no-unused-vars
import { Locals, Request } from 'express'
import { JobInterface } from './job/JobInterface'
import { RequestData } from './RequestData'
import { UseCaseResponseInterface } from './useCase/UseCaseResponseInterface'

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
