import { NextFunction, Request, Response } from 'express'
import { JobInterface } from '../../types/job/JobInterface'
import { UseCaseResponseInterface } from '../../types/useCase/UseCaseResponseInterface'
import { sendJsonMiddleware } from './sendJsonMiddleware'

describe('sendJsonMiddleware', () => {
	let mockReq: Partial<Request>
	let mockRes: Partial<Response>
	let mockNext: NextFunction
	let mockJob: JobInterface
	let mockUseCaseResponse: UseCaseResponseInterface

	beforeEach(() => {
		mockJob = {
			getId: jest.fn().mockReturnValue('job-123'),
			getPublicUser: jest
				.fn()
				.mockReturnValue({ id: 'user-456', name: 'Test User' })
		} as unknown as JobInterface

		mockUseCaseResponse = {
			data: { foo: 'bar' },
			metadata: { total: 1 }
		}

		mockReq = {}
		mockRes = {
			locals: {
				job: mockJob,
				useCaseResponse: mockUseCaseResponse
			},
			status: jest.fn().mockReturnThis(),
			json: jest.fn()
		}
		mockNext = jest.fn()
	})

	it('should send a 200 JSON response with job and useCaseResponse data', () => {
		sendJsonMiddleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockRes.status).toHaveBeenCalledWith(200)
		expect(mockRes.json).toHaveBeenCalledWith({
			jobId: 'job-123',
			data: { foo: 'bar' },
			metadata: { total: 1 }
		})
	})
})
