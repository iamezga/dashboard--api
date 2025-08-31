import { deepMerge } from './deepMerge'

describe('deepMerge', () => {
	it('should merge flat objects', () => {
		const target = { a: 1, b: 2 }
		const source = { b: 3, c: 4 }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: 1, b: 3, c: 4 })
	})

	it('should deeply merge nested objects', () => {
		const target = { a: { x: 1, y: 2 }, b: 10 }
		const source = { a: { y: 99, z: 5 } }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: { x: 1, y: 99, z: 5 }, b: 10 })
	})

	it('should overwrite arrays instead of merging them', () => {
		const target = { a: [1, 2], b: { c: [3, 4] } }
		const source = { a: [9], b: { c: [8, 7] } }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: [9], b: { c: [8, 7] } })
	})

	it('should overwrite primitive values', () => {
		const target = { a: 1, b: 'hello' }
		const source = { a: 2, b: 'world' }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: 2, b: 'world' })
	})

	it('should add properties from source if not in target', () => {
		const target = { a: 1 }
		const source = { b: { c: 2 } }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: 1, b: { c: 2 } })
	})

	it('should not mutate target or source objects', () => {
		const target = { a: { b: 1 } }
		const source = { a: { c: 2 } }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: { b: 1, c: 2 } })
		expect(target).toEqual({ a: { b: 1 } }) // unchanged
		expect(source).toEqual({ a: { c: 2 } }) // unchanged
	})

	it('should handle null and undefined values correctly', () => {
		const target = { a: { b: 1 }, d: 4 }
		const source = { a: null, c: undefined }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: null, d: 4, c: undefined })
	})

	it('should return shallow copy if source is empty', () => {
		const target = { a: 1 }
		const result = deepMerge(target, {})

		expect(result).toEqual({ a: 1 })
		expect(result).not.toBe(target) // new object
	})

	it('should return shallow copy if target is empty', () => {
		const source = { a: 1 }
		const result = deepMerge({}, source)

		expect(result).toEqual({ a: 1 })
	})
})
