/**
 * @interface PaginationMeta
 * @description Metadata about pagination state and navigation.
 * Returned in paginated responses to help clients navigate results.
 *
 * @example
 * ```typescript
 * {
 *   currentPage: 2,
 *   totalPages: 5,
 *   totalItems: 95,
 *   itemsPerPage: 20,
 *   hasNextPage: true,
 *   hasPreviousPage: true
 * }
 * ```
 */
export interface PaginationMeta {
	/**
	 * Current page number (1-indexed).
	 */
	currentPage: number

	/**
	 * Total number of pages available.
	 */
	totalPages: number

	/**
	 * Total number of items across all pages.
	 */
	totalItems: number

	/**
	 * Number of items per page (limit).
	 */
	itemsPerPage: number

	/**
	 * Whether there is a next page available.
	 */
	hasNextPage: boolean

	/**
	 * Whether there is a previous page available.
	 */
	hasPreviousPage: boolean
}
