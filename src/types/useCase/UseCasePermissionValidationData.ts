/**
 * Interface for the object returned by the getPermissionValidationData method.
 * It contains the validation schema and the data to be validated.
 */
export interface UseCasePermissionValidationData<
	TSchema = Record<string, any>,
	TData = Record<string, any>
> {
	/**
	 * Fastest validator schema
	 */
	schema: TSchema
	/**
	 * Concrete data to contrast with the schema based on permission configuration.
	 * This data is defined by the useCase based on the business logic that it requires and defines
	 */
	data: TData
}
