//
/**
 * useCase.run () return interface.
 * This return will be part of the final http response
 */
export interface UseCaseResponseInterface {
	data: Record<string, any>
	// It will contain extra/related data. e.g.: pagination.
	metadata?: Record<string, any>
}
