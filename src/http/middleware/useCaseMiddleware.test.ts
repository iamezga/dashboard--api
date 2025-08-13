import { Request, Response } from 'express'
import { useCases } from '../../modules'
import { useCaseMiddleware } from './useCaseMiddleware'

jest.mock('@/modules', () => ({
	useCases: {}
}))

jest.mock('@/services/dependencyContainer', () => ({
	dependencyContainer: {}
}))

describe('useCaseMiddleware', () => {
	let mockReq: Partial<Request>
	let mockRes: Partial<Response>
	let mockNext: jest.Mock
	let mockJob: any

	beforeEach(() => {
		jest.clearAllMocks()
		jest.resetModules()

		mockJob = { id: 'job1' }
		mockReq = {}
		mockRes = { locals: {} }
		mockNext = jest.fn()
	})

	it('should error if job is missing', async () => {
		const middleware = useCaseMiddleware('SomeUseCase' as any)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockNext).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('`jobMiddleware` must be run before')
			})
		)
	})

	it('should error if use case not found', async () => {
		;(mockRes.locals as any).job = mockJob
		const middleware = useCaseMiddleware('MissingUseCase' as any)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockNext).toHaveBeenCalledWith(
			expect.objectContaining({
				message: expect.stringContaining('Use case "MissingUseCase" not found.')
			})
		)
	})

	it('should execute use case and store response', async () => {
		const mockRun = jest.fn().mockResolvedValue({ data: 'ok' })
		class FakeUseCase {
			constructor(_: any) {}
			run = mockRun
		}

		;(useCases as any).TestUseCase = FakeUseCase
		;(mockRes.locals as any).job = mockJob

		const middleware = useCaseMiddleware('TestUseCase' as any)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockRun).toHaveBeenCalledWith(mockJob)
		expect(mockRes.locals?.useCaseResponse).toEqual({ data: 'ok' })
		expect(mockNext).toHaveBeenCalledWith()
	})

	it('should pass error from use case run to next', async () => {
		const mockError = new Error('Boom')
		class FakeUseCase {
			constructor(_: any) {}
			run = jest.fn().mockRejectedValue(mockError)
		}

		;(useCases as any).TestUseCase = FakeUseCase
		;(mockRes.locals as any).job = mockJob

		const middleware = useCaseMiddleware('TestUseCase' as any)
		await middleware(mockReq as Request, mockRes as Response, mockNext)

		expect(mockNext).toHaveBeenCalledWith(mockError)
	})
})
