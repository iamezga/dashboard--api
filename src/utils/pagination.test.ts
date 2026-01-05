import {
	buildPaginationMeta,
	normalizePagination,
	PAGINATION_DEFAULTS,
	validatePaginationInput
} from './pagination'

describe('pagination utils', () => {
	describe('normalizePagination', () => {
		it('should use defaults when called without arguments', () => {
			const result = normalizePagination()

			expect(result).toEqual({
				page: PAGINATION_DEFAULTS.PAGE,
				limit: PAGINATION_DEFAULTS.LIMIT,
				sortBy: PAGINATION_DEFAULTS.SORT_BY,
				sortOrder: PAGINATION_DEFAULTS.SORT_ORDER,
				skip: 0
			})
		})

		it('should use defaults when no input provided', () => {
			const result = normalizePagination({})

			expect(result).toEqual({
				page: PAGINATION_DEFAULTS.PAGE,
				limit: PAGINATION_DEFAULTS.LIMIT,
				sortBy: PAGINATION_DEFAULTS.SORT_BY,
				sortOrder: PAGINATION_DEFAULTS.SORT_ORDER,
				skip: 0
			})
		})

		it('should use custom default sortBy when provided', () => {
			const result = normalizePagination({}, 'email')

			expect(result.sortBy).toBe('email')
		})

		it('should normalize page to minimum 1', () => {
			expect(normalizePagination({ page: -5 }).page).toBe(1)
			expect(normalizePagination({ page: 0 }).page).toBe(1)
			expect(normalizePagination({ page: 1 }).page).toBe(1)
		})

		it('should normalize limit within min/max range', () => {
			expect(normalizePagination({ limit: -10 }).limit).toBe(
				PAGINATION_DEFAULTS.MIN_LIMIT
			)
			expect(normalizePagination({ limit: 0 }).limit).toBe(
				PAGINATION_DEFAULTS.MIN_LIMIT
			)
			expect(normalizePagination({ limit: 500 }).limit).toBe(
				PAGINATION_DEFAULTS.MAX_LIMIT
			)
			expect(normalizePagination({ limit: 50 }).limit).toBe(50)
		})

		it('should calculate skip offset correctly', () => {
			expect(normalizePagination({ page: 1, limit: 20 }).skip).toBe(0)
			expect(normalizePagination({ page: 2, limit: 20 }).skip).toBe(20)
			expect(normalizePagination({ page: 3, limit: 50 }).skip).toBe(100)
		})

		it('should preserve valid sortBy and sortOrder', () => {
			const result = normalizePagination({
				sortBy: 'name',
				sortOrder: 'desc'
			})

			expect(result.sortBy).toBe('name')
			expect(result.sortOrder).toBe('desc')
		})

		it('should use default sortOrder if not provided', () => {
			const result = normalizePagination({ sortBy: 'email' })

			expect(result.sortOrder).toBe(PAGINATION_DEFAULTS.SORT_ORDER)
		})
	})

	describe('buildPaginationMeta', () => {
		it('should build correct metadata for first page', () => {
			const meta = buildPaginationMeta(95, 1, 20)

			expect(meta).toEqual({
				currentPage: 1,
				totalPages: 5,
				totalItems: 95,
				itemsPerPage: 20,
				hasNextPage: true,
				hasPreviousPage: false
			})
		})

		it('should build correct metadata for middle page', () => {
			const meta = buildPaginationMeta(95, 3, 20)

			expect(meta).toEqual({
				currentPage: 3,
				totalPages: 5,
				totalItems: 95,
				itemsPerPage: 20,
				hasNextPage: true,
				hasPreviousPage: true
			})
		})

		it('should build correct metadata for last page', () => {
			const meta = buildPaginationMeta(95, 5, 20)

			expect(meta).toEqual({
				currentPage: 5,
				totalPages: 5,
				totalItems: 95,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: true
			})
		})

		it('should handle exact division of items', () => {
			const meta = buildPaginationMeta(100, 2, 20)

			expect(meta.totalPages).toBe(5)
			expect(meta.hasNextPage).toBe(true)
		})

		it('should handle zero items', () => {
			const meta = buildPaginationMeta(0, 1, 20)

			expect(meta).toEqual({
				currentPage: 1,
				totalPages: 1,
				totalItems: 0,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			})
		})

		it('should handle single page of results', () => {
			const meta = buildPaginationMeta(15, 1, 20)

			expect(meta).toEqual({
				currentPage: 1,
				totalPages: 1,
				totalItems: 15,
				itemsPerPage: 20,
				hasNextPage: false,
				hasPreviousPage: false
			})
		})

		it('should round up for fractional pages', () => {
			const meta = buildPaginationMeta(95, 1, 20)

			expect(meta.totalPages).toBe(5) // 95 / 20 = 4.75 -> 5
		})
	})

	describe('validatePaginationInput', () => {
		it('should not throw for valid input', () => {
			expect(() =>
				validatePaginationInput({
					page: 1,
					limit: 20,
					sortBy: 'name',
					sortOrder: 'asc'
				})
			).not.toThrow()

			expect(() => validatePaginationInput({})).not.toThrow()
		})

		it('should throw for invalid page', () => {
			expect(() => validatePaginationInput({ page: 0 })).toThrow(
				'Page must be >= 1'
			)
			expect(() => validatePaginationInput({ page: -1 })).toThrow(
				'Page must be >= 1'
			)
		})

		it('should throw for limit below minimum', () => {
			expect(() => validatePaginationInput({ limit: 0 })).toThrow(
				`Limit must be >= ${PAGINATION_DEFAULTS.MIN_LIMIT}`
			)
		})

		it('should throw for limit above maximum', () => {
			expect(() => validatePaginationInput({ limit: 500 })).toThrow(
				`Limit must be <= ${PAGINATION_DEFAULTS.MAX_LIMIT}`
			)
		})

		it('should throw for invalid sort order', () => {
			expect(() =>
				validatePaginationInput({ sortOrder: 'invalid' as any })
			).toThrow('Sort order must be "asc" or "desc"')
		})

		it('should accept valid limit values', () => {
			expect(() =>
				validatePaginationInput({ limit: PAGINATION_DEFAULTS.MIN_LIMIT })
			).not.toThrow()
			expect(() =>
				validatePaginationInput({ limit: PAGINATION_DEFAULTS.MAX_LIMIT })
			).not.toThrow()
			expect(() => validatePaginationInput({ limit: 50 })).not.toThrow()
		})
	})
})
