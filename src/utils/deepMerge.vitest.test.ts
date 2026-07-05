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
		expect(target).toEqual({ a: { b: 1 } })
		expect(source).toEqual({ a: { c: 2 } })
	})

	it('should ignore undefined values and empty objects from source', () => {
		const target = { a: { b: 1 }, d: 4 }
		const source = { a: null, c: undefined, e: {} }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: null, d: 4, c: undefined, e: {} })
	})

	it('should return shallow copy if source is empty', () => {
		const target = { a: 1 }
		const result = deepMerge(target, {})

		expect(result).toEqual({ a: 1 })
		expect(result).not.toBe(target)
	})

	it('should return shallow copy if target is empty', () => {
		const source = { a: 1 }
		const result = deepMerge({}, source)

		expect(result).toEqual({ a: 1 })
	})

	it('should overwrite value when source provides a primitive or array', () => {
		const target1 = { a: { b: 1 } }
		const source1 = { a: 42 }
		const result1 = deepMerge(target1, source1)
		expect(result1).toEqual({ a: 42 })

		const target2 = { a: { b: 1 } }
		const source2 = { a: [1, 2, 3] }
		const result2 = deepMerge(target2, source2)
		expect(result2).toEqual({ a: [1, 2, 3] })
	})

	it('should skip empty nested objects in source', () => {
		const target = { a: { b: 1, c: 2 } }
		const source = { a: {} }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: { b: 1, c: 2 } })
	})

	it('should merge non-empty nested objects when key exists in target', () => {
		const target = { a: { b: 1 } }
		const source = { a: { c: 2 } }
		const result = deepMerge(target, source)

		expect(result).toEqual({ a: { b: 1, c: 2 } })
	})

	it('should handle target or source being non-objects', () => {
		const result1 = deepMerge(42 as any, { a: 1 })
		expect(result1).toEqual({ a: 1 })

		const result2 = deepMerge({ a: 1 }, null as any)
		expect(result2).toEqual({ a: 1 })

		const result3 = deepMerge(42 as any, 'hello' as any)
		expect(result3).toEqual({})
	})

	it('should convert both target and source to empty object if both non-objects at root', () => {
		const result = deepMerge()
		expect(result).toEqual({})
	})

	it('should convert both target and source to empty object if both non-objects at root', () => {
		const result = deepMerge()
		expect(result).toEqual({})
	})

	it('should preserve original config when merging with empty config', () => {
		const target = {
			key: 'auth.login',
			active: true,
			deletedAt: null,
			config: {
				conditions: {
					accessDays: {
						enabled: true,
						values: ['Monday', 'Tuesday']
					},
					accessTime: {
						enabled: true,
						options: { from: '08:00', to: '18:00' }
					}
				}
			}
		}
		const source = { config: {} }

		const result = deepMerge(target, source)

		expect(result).toEqual(target)
	})

	it('should override specific primitive in nested config while keeping the rest', () => {
		const target = {
			key: 'auth.login',
			active: true,
			deletedAt: null,
			config: {
				conditions: {
					accessDays: {
						enabled: true,
						values: ['Monday', 'Tuesday']
					},
					accessTime: {
						enabled: true,
						options: { from: '08:00', to: '18:00' }
					}
				}
			}
		}
		const source = {
			config: {
				conditions: {
					accessDays: {
						enabled: false
					}
				}
			}
		}

		const expected = {
			key: 'auth.login',
			active: true,
			deletedAt: null,
			config: {
				conditions: {
					accessDays: {
						enabled: false,
						values: ['Monday', 'Tuesday']
					},
					accessTime: {
						enabled: true,
						options: { from: '08:00', to: '18:00' }
					}
				}
			}
		}

		const result = deepMerge(target, source)

		expect(result).toEqual(expected)
	})

	it('should add missing empty objects from source', () => {
		const target = { key: 'auth.login', active: true }
		const source = { config: {} }
		const result = deepMerge(target, source)
		expect(result).toEqual({ key: 'auth.login', active: true, config: {} })
	})
})
