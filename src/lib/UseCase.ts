import { DependencyContainer } from '@/services/dependencyContainer'
import { JobInterface } from '@/types/job/JobInterface'
import { UseCaseInterface } from '@/types/useCase/UseCaseInterface'
import { UseCaseResponseInterface } from '@/types/useCase/UseCaseResponseInterface'

/**
 * Abstract base class for all use cases.
 *
 * This class provides a contract and a minimal skeleton for specific use cases.
 * Its main responsibility is to define the `run` method, which encapsulates the
 * business logic for a specific action.
 *
 * Use cases that inherit from this class should focus exclusively on business logic,
 * assuming that all data has already been validated and prepared by the middleware
 * chain prior to accessing the use case.
 *
 * The class can interact with multiple external services. To simplify and standardize the
 * constructor for all use cases, a dependency container (`dependencyContainer`) for services
 * and dependencies was defined.
 */
export abstract class UseCase<J extends JobInterface = JobInterface>
	implements UseCaseInterface<J>
{
	constructor(protected container: DependencyContainer) {}

	/**
	 * The `run` method is the entry point for executing the use case's business logic.
	 *
	 * @param job The Job object containing all the necessary data and context for the request.
	 * @returns A promise that resolves to an object containing the use case's response data.
	 */
	public abstract run(job: J): Promise<UseCaseResponseInterface>
}
