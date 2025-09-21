import { DependencyContainer, getContainer } from '@/core/dependencyContainer'
import { UseCaseKeys, useCases } from '@/modules'
import { UseCaseInterface } from '@/types/useCase/UseCaseInterface'

type UseCaseClass = new (
	container: DependencyContainer,
	options?: Record<string, any>
) => UseCaseInterface

interface UseCaseFactoryOptions {
	container?: DependencyContainer
	options?: Record<string, any>
}

/**
 * Creates an instance of a specified use case by its name.
 * This factory handles the dynamic instantiation and dependency injection for use cases.
 *
 * @param {UseCaseKeys} useCaseName - The name of the use case to create (e.g., 'AuthLoginUseCase').
 * @param {UseCaseFactoryOptions} [factoryOptions={}] - Optional configuration for the factory, containing the container and/or options.
 * @returns {UseCaseInterface} An instance of the requested use case.
 * @throws {Error} If the use case class for the given name is not found.
 */
export function useCaseFactory(
	useCaseName: UseCaseKeys,
	{ container = getContainer(), options }: UseCaseFactoryOptions = {}
): UseCaseInterface {
	const useCaseClass = useCases[useCaseName] as UseCaseClass | undefined
	if (!useCaseClass) {
		throw new Error(`Use case "${useCaseName}" not found.`)
	}

	return new useCaseClass(container, options)
}
