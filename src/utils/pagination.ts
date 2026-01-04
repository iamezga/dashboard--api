import {
	NormalizedPaginationInput,
	PaginationInput,
	PaginationMeta
} from '@/types/pagination'

/**
 * Default pagination values used throughout the application.
 */
export const PAGINATION_DEFAULTS = {
	PAGE: 1,
	LIMIT: 20,
	MIN_LIMIT: 1,
	MAX_LIMIT: 100,
	SORT_ORDER: 'asc' as const,
	SORT_BY: 'createdAt'
} as const

/**
 * @function normalizePagination
 * @description Normalizes pagination input by filling in defaults and calculating skip offset.
 * Ensures all pagination values are within valid ranges.
 *
 * @param {PaginationInput} input - Raw pagination input from request
 * @param {string} defaultSortBy - Default field to sort by if not specified
 * @returns {NormalizedPaginationInput} Normalized pagination with all fields populated
 *
 * @example
 * ```typescript
 * const normalized = normalizePagination({ page: 2, limit: 50 }, 'email')
 * // Returns:
 * // {
 * //   page: 2,
 * //   limit: 50,
 * //   sortBy: 'email',
 * //   sortOrder: 'asc',
 * //   skip: 50
 * // }
 * ```
 */
export function normalizePagination(
	input: PaginationInput = {},
	defaultSortBy: string = PAGINATION_DEFAULTS.SORT_BY
): NormalizedPaginationInput {
	// Normalize page (ensure >= 1)
	const page = Math.max(1, input.page ?? PAGINATION_DEFAULTS.PAGE)

	// Normalize limit (ensure within min/max range)
	let limit = input.limit ?? PAGINATION_DEFAULTS.LIMIT
	limit = Math.max(PAGINATION_DEFAULTS.MIN_LIMIT, limit)
	limit = Math.min(PAGINATION_DEFAULTS.MAX_LIMIT, limit)

	// Normalize sort
	const sortBy = input.sortBy ?? defaultSortBy
	const sortOrder = input.sortOrder ?? PAGINATION_DEFAULTS.SORT_ORDER

	// Calculate skip offset
	const skip = (page - 1) * limit

	return {
		page,
		limit,
		sortBy,
		sortOrder,
		skip
	}
}

/**
 * @function buildPaginationMeta
 * @description Builds pagination metadata for responses.
 * Calculates total pages, navigation flags, etc.
 *
 * @param {number} totalItems - Total number of items across all pages
 * @param {number} currentPage - Current page number (1-indexed)
 * @param {number} itemsPerPage - Number of items per page
 * @returns {PaginationMeta} Complete pagination metadata
 *
 * @example
 * ```typescript
 * const meta = buildPaginationMeta(95, 2, 20)
 * // Returns:
 * // {
 * //   currentPage: 2,
 * //   totalPages: 5,
 * //   totalItems: 95,
 * //   itemsPerPage: 20,
 * //   hasNextPage: true,
 * //   hasPreviousPage: true
 * // }
 * ```
 */
export function buildPaginationMeta(
	totalItems: number,
	currentPage: number,
	itemsPerPage: number
): PaginationMeta {
	const totalPages = Math.ceil(totalItems / itemsPerPage) || 1

	return {
		currentPage,
		totalPages,
		totalItems,
		itemsPerPage,
		hasNextPage: currentPage < totalPages,
		hasPreviousPage: currentPage > 1
	}
}

/**
 * @function validatePaginationInput
 * @description Validates pagination input and throws descriptive errors.
 * Useful for API input validation before processing.
 *
 * @param {PaginationInput} input - Pagination input to validate
 * @throws {Error} If validation fails
 *
 * @example
 * ```typescript
 * try {
 *   validatePaginationInput({ page: -1, limit: 1000 })
 * } catch (error) {
 *   console.error(error.message) // "Page must be >= 1"
 * }
 * ```
 */
export function validatePaginationInput(input: PaginationInput): void {
	if (input.page !== undefined && input.page < 1) {
		throw new Error('Page must be >= 1')
	}

	if (input.limit !== undefined) {
		if (input.limit < PAGINATION_DEFAULTS.MIN_LIMIT) {
			throw new Error(`Limit must be >= ${PAGINATION_DEFAULTS.MIN_LIMIT}`)
		}
		if (input.limit > PAGINATION_DEFAULTS.MAX_LIMIT) {
			throw new Error(`Limit must be <= ${PAGINATION_DEFAULTS.MAX_LIMIT}`)
		}
	}

	if (
		input.sortOrder !== undefined &&
		input.sortOrder !== 'asc' &&
		input.sortOrder !== 'desc'
	) {
		throw new Error('Sort order must be "asc" or "desc"')
	}
}
