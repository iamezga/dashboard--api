import { useCases } from '@/modules' // Objeto que contiene las clases de los casos de uso
import {
	dependencyContainer,
	DependencyContainer
} from '@/services/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseInterface } from '@/types/useCase/UseCaseInterface'
import { NextFunction, Request, Response } from 'express'

// This function is responsible for creating an instance of a use.
// We could generate a "factory" for this if the creation logic were more complex.
const createUseCaseInstance = (
	useCaseClass: any,
	container: DependencyContainer
): UseCaseInterface => {
	return new useCaseClass(container) as UseCaseInterface
}

/**
 * Middleware responsible for executing the use case's business logic.
 * It takes the name of the use case as an argument to create and run the correct instance.
 */
export const useCaseMiddleware = (useCaseName: keyof typeof useCases) => {
	return async (_req: Request, res: Response, next: NextFunction) => {
		try {
			const job = res.locals.job as JobInterface

			if (!job) {
				return next(
					new Error('`jobMiddleware` must be run before `useCaseMiddleware`.')
				)
			}

			// Obtain the class of the use case using the name.
			const useCaseClass = useCases[useCaseName]
			if (!useCaseClass) {
				return next(new Error(`Use case "${useCaseName}" not found.`))
			}

			// Create an instance of the use case by injecting the dependencies
			const useCase = createUseCaseInstance(useCaseClass, dependencyContainer)

			// Run the use case
			const useCaseResponse = await useCase.run(job)

			// Send the customer response.| TODO -> create a response middleware
			return res.status(200).json({
				jobId: job.getId(),
				// use case response data
				data: useCaseResponse.data,
				// useCase related metadata
				metadata: useCaseResponse.metadata,
				// If the Job has public user data, we can also include them
				user: job.getPublicUser()
			})
		} catch (error) {
			return next(error)
		}
	}
}
