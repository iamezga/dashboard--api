import { useCaseFactory } from '@/core/useCaseFactory'
import { UseCaseKeys } from '@/modules' // Objeto que contiene las clases de los casos de uso
import { JobInterface } from '@/types/job/JobInterface'
import { NextFunction, Request, Response } from 'express'

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
export const useCaseMiddleware = (useCaseName: UseCaseKeys) => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const job = res.locals.job as JobInterface

			if (!job) {
				return next(
					new Error('`jobMiddleware` must be run before `useCaseMiddleware`.')
				)
			}

			const useCase = useCaseFactory(useCaseName)
			const useCaseResponse = await useCase.run(job)

			res.locals.useCaseResponse = useCaseResponse

			next()
		} catch (error) {
			return next(error)
		}
	}
}
