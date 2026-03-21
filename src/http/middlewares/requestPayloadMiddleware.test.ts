import { NextFunction, Request, Response } from 'express'
import { UnauthorizedError } from '../../errors'
import { JobInterface } from '../../types/job/JobInterface'
import { requestPayloadMiddleware } from './requestPayloadMiddleware'

describe('requestPayloadMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: jest.Mock
	let job: any

	beforeEach(() => {
		req = {
			params: { id: '123' },
			query: { q: 'test' },
			body: { name: 'John' },
			files: { file: 'fileData' }
		} as any
		job = {
			setData: jest.fn(),
			setRecaptchaResponse: jest.fn()
		} as unknown as JobInterface
		res = { locals: { job } }
		next = jest.fn()
	})

	it('should consolidate params, query, body, and files into job.setData', () => {
		requestPayloadMiddleware()(
			req as Request,
			res as Response,
			next as NextFunction
		)
		expect(job.setData).toHaveBeenCalledWith({
			id: '123',
			q: 'test',
			name: 'John',
			files: { file: 'fileData' }
		})
		expect(job.setRecaptchaResponse).toHaveBeenCalledWith(undefined)
		expect(next).toHaveBeenCalled()
	})

	it('should extract g-recaptcha-response and call setRecaptchaResponse', () => {
		req.body = { ...req.body, 'g-recaptcha-response': 'recaptcha-token' }
		requestPayloadMiddleware()(
			req as Request,
			res as Response,
			next as NextFunction
		)
		expect(job.setRecaptchaResponse).toHaveBeenCalledWith('recaptcha-token')
		expect(job.setData).toHaveBeenCalledWith({
			id: '123',
			q: 'test',
			name: 'John',
			files: { file: 'fileData' }
		})
	})

	it('should throw UnauthorizedError if job is missing', () => {
		res.locals = <any>{}
		expect(() =>
			requestPayloadMiddleware()(
				req as Request,
				res as Response,
				next as NextFunction
			)
		).toThrow(UnauthorizedError)
	})

	it('should respect input config to include only specific sources', () => {
		requestPayloadMiddleware({
			params: true,
			query: false,
			body: false,
			files: false
		})(req as Request, res as Response, next as NextFunction)
		expect(job.setData).toHaveBeenCalledWith({ id: '123' })
	})
})
