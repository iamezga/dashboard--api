import { NextFunction, Request, Response } from 'express'
import { getContainer } from '../../core/dependencyContainer'
import { useCaseFactory } from '../../core/useCaseFactory'
import { JobInterface } from '../../types/job/JobInterface'
import { useCaseMiddleware } from './useCaseMiddleware'

jest.mock('@/core/useCaseFactory')
jest.mock('@/core/dependencyContainer')

describe('useCaseMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: NextFunction
	let mockJob: JobInterface
	let mockUseCaseRun: jest.Mock
	let mockUseCase: any
	let mockAuditRecord: jest.Mock

	beforeEach(() => {
		jest.clearAllMocks()

		mockJob = {
			id: 'job1',
			data: {},
			getMeta: jest.fn().mockReturnValue({ method: 'GET', url: '/v1/test' })
		} as unknown as JobInterface
		mockUseCaseRun = jest.fn().mockResolvedValue('result')
		mockUseCase = { run: mockUseCaseRun }
		mockAuditRecord = jest.fn().mockResolvedValue(undefined)

		req = {}
		res = { locals: { job: mockJob } }
		next = jest.fn()
		;(useCaseFactory as jest.Mock).mockReturnValue(mockUseCase)
		;(getContainer as jest.Mock).mockReturnValue({
			services: {
				auditService: {
					record: mockAuditRecord
				}
			}
		})
	})

	it('should execute the use case and store response in res.locals', async () => {
		const middleware = useCaseMiddleware('TestUseCase' as any)
		await middleware(req as Request, res as Response, next)

		expect(useCaseFactory).toHaveBeenCalledWith('TestUseCase')
		expect(mockUseCaseRun).toHaveBeenCalledWith(mockJob)
		expect(mockAuditRecord).toHaveBeenCalledWith(
			'endpoint.TestUseCase.success',
			mockJob,
			'useCase',
			'TestUseCase',
			expect.objectContaining({
				method: 'GET',
				url: '/v1/test',
				statusCode: 200
			}),
			undefined,
			expect.objectContaining({
				category: 'operational',
				severity: 'info',
				result: { status: 'success' }
			})
		)
		expect(res.locals!.useCaseResponse).toBe('result')
		expect(next).toHaveBeenCalledWith()
	})

	it('should call next with error if no job is in res.locals', async () => {
		const middleware = useCaseMiddleware('TestUseCase' as any)
		res.locals!.job = undefined as any

		await middleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalled()
		const error = (next as jest.Mock).mock.calls[0][0]
		expect(error).toBeInstanceOf(Error)
		expect(error.message).toBe(
			'`jobMiddleware` must be run before `useCaseMiddleware`.'
		)
	})

	it('should call next with error if useCase.run throws', async () => {
		mockUseCaseRun.mockRejectedValueOnce(new Error('run-fail'))
		const middleware = useCaseMiddleware('TestUseCase' as any)

		await middleware(req as Request, res as Response, next)

		expect(next).toHaveBeenCalled()
		const error = (next as jest.Mock).mock.calls[0][0]
		expect(error).toBeInstanceOf(Error)
		expect(error.message).toBe('run-fail')
	})
})
