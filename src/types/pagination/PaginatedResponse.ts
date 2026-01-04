import { PaginationMeta } from './PaginationMeta'

/**
 * @interface PaginatedResponse
 * @description Standard response format for paginated lists.
 * Generic type T represents the type of items in the list.
 *
 * @template T - The type of items in the paginated list
 *
 * @example
 * ```typescript
 * const response: PaginatedResponse<User> = {
 *   items: [user1, user2, ...],
 *   pagination: {
 *     currentPage: 1,
 *     totalPages: 5,
 *     totalItems: 95,
 *     itemsPerPage: 20,
 *     hasNextPage: true,
 *     hasPreviousPage: false
 *   }
 * }
 * ```
 */
export interface PaginatedResponse<T> {
	/**
	 * Array of items for the current page.
	 */
	items: T[]

	/**
	 * Pagination metadata.
	 */
	pagination: PaginationMeta
}
