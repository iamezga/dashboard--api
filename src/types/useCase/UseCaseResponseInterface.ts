/**
 * @interface UseCaseResponseInterface
 * @description Defines the standard return interface for all use cases.
 * This interface is generic, allowing the 'data' payload and 'metadata' to be strongly typed
 * for each specific use case, while 'Record<string, any>' serves as the default.
 *
 * @template TData - The type of the 'data' payload. Defaults to Record<string, any>.
 * @template TMetadata - The type of the 'metadata' payload. Defaults to Record<string, any>.
 */
export interface UseCaseResponseInterface<
	TData = Record<string, any>,
	TMetadata = Record<string, any>
> {
	/**
	 * The main data payload of the use case's response.
	 */
	data: TData
	/**
	 * Optional extra or related metadata for the response (e.g., pagination details, status messages).
	 */
	metadata?: TMetadata
}
