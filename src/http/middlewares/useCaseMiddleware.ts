import { getContainer } from '@/core/dependencyContainer'
import { useCaseFactory } from '@/core/useCaseFactory'
import { UseCaseKeys } from '@/modules' // Objeto que contiene las clases de los casos de uso
import { NextFunction, Request, RequestHandler, Response } from 'express'

/**
 * @function useCaseMiddleware
 * @description A middleware factory that creates a handler to execute a specific use case.
 * It dynamically instantiates the use case using `useCaseFactory`, runs it with the
 * `Job` object from `res.locals`, and stores the result in `res.locals.useCaseResponse`.
 *
 * This middleware is a core part of the request processing pipeline, bridging the HTTP
 * layer with the application's business logic.
 *
 * @param {UseCaseKeys} useCaseName - The name of the use case to execute (e.g., 'UserCreateUseCase').
 * @returns {RequestHandler} An Express middleware function.
 */
export const useCaseMiddleware = (useCaseName: UseCaseKeys): RequestHandler => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const { job } = res.locals

			if (!job) {
				return next(
					new Error('`jobMiddleware` must be run before `useCaseMiddleware`.')
				)
			}

			const useCase = useCaseFactory(useCaseName)
			const useCaseResponse = await useCase.run(job)

			await getContainer().services.auditService.record(
				`endpoint.${String(useCaseName)}.success`,
				job,
				'useCase',
				String(useCaseName),
				{
					method: job.getMeta()?.method,
					url: job.getMeta()?.url,
					statusCode: 200
				},
				undefined,
				{
					category: 'operational',
					severity: 'info',
					result: {
						status: 'success'
					},
					tags: ['http', 'endpoint']
				}
			)

			res.locals.useCaseResponse = useCaseResponse

			next()
		} catch (error: any) {
			return next(error)
		}
	}
}
