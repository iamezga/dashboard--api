import { vi } from 'vitest'
import { NextFunction, Request, Response } from 'express'
import { getContainer } from '../../core/dependencyContainer'
import { useCaseFactory } from '../../core/useCaseFactory'
import { JobInterface } from '../../types/job/JobInterface'
import { useCaseMiddleware } from './useCaseMiddleware'

vi.mock('@/core/useCaseFactory')
vi.mock('@/core/dependencyContainer')

describe('useCaseMiddleware', () => {
	let req: Partial<Request>
	let res: Partial<Response>
	let next: NextFunction
	let mockJob: JobInterface
	let mockUseCaseRun: ReturnType<typeof vi.fn>
	let mockUseCase: any
	let mockAuditRecord: ReturnType<typeof vi.fn>

	beforeEach(() => {
		vi.clearAllMocks()

		mockJob = {
			id: 'job1',
			data: {},
			getMeta: vi.fn().mockReturnValue({ method: 'GET', url: '/v1/test' })
		} as unknown as JobInterface
		mockUseCaseRun = vi.fn().mockResolvedValue('result')
		mockUseCase = { run: mockUseCaseRun }
		mockAuditRecord = vi.fn().mockResolvedValue(undefined)

		req = {}
		res = { locals: { job: mockJob } }
		next = vi.fn()
		;(useCaseFactory as ReturnType<typeof vi.fn>).mockReturnValue(mockUseCase)
		;(getContainer as ReturnType<typeof vi.fn>).mockReturnValue({
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
		const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
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
		const error = (next as ReturnType<typeof vi.fn>).mock.calls[0][0]
		expect(error).toBeInstanceOf(Error)
		expect(error.message).toBe('run-fail')
	})
})
