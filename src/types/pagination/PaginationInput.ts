/**
 * @interface PaginationInput
 * @description Input parameters for pagination requests.
 * Used in find/list use cases to control pagination behavior.
 *
 * @example
 * ```typescript
 * const pagination: PaginationInput = {
 *   page: 1,
 *   limit: 20,
 *   sortBy: 'createdAt',
 *   sortOrder: 'desc'
 * }
 * ```
 */
export interface PaginationInput {
	/**
	 * Page number (1-indexed).
	 * @default 1
	 */
	page?: number

	/**
	 * Number of items per page.
	 * @default 20
	 * @minimum 1
	 * @maximum 100
	 */
	limit?: number

	/**
	 * Field to sort by.
	 * @example 'createdAt', 'name', 'email'
	 */
	sortBy?: string

	/**
	 * Sort direction.
	 * @default 'asc'
	 */
	sortOrder?: 'asc' | 'desc'
}

/**
 * @interface NormalizedPaginationInput
 * @description Pagination input with all optional fields filled with defaults.
 * This is the result of normalizing PaginationInput.
 */
export interface NormalizedPaginationInput {
	page: number
	limit: number
	sortBy: string
	sortOrder: 'asc' | 'desc'
	skip: number
}
