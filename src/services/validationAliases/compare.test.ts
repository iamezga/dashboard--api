import { ValidationService } from '../validationService'
import { compare } from './compare'

describe('compare alias (ValidationService)', () => {
	let v: ValidationService

	beforeEach(() => {
		v = new ValidationService({ aliases: { compare } })
	})

	it('should pass strict type check when both values are primitive of same type', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'eq', value: 10, strict: true }
		}
		const errors = await v.validate({ value: 5 }, schema)

		expect(errors[0].message).toContain('must be equal to')
	})

	it('should fail strict type check when types mismatch (primitive vs object)', async () => {
		const schema = {
			value: {
				type: 'compare',
				comparison: 'eq',
				value: { a: 1 },
				strict: true
			}
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors[0].message).toContain('must be the same type')
	})

	it('should fail strict type check when types mismatch (object vs array)', async () => {
		const schema = {
			value: {
				type: 'compare',
				comparison: 'eq',
				value: [1, 2, 3],
				strict: true
			}
		}
		const errors = await v.validate({ value: { a: 1 } }, schema)
		expect(errors[0].message).toContain('must be the same type')
	})

	it('should fail if comparison operator is missing', async () => {
		const schema = { value: { type: 'compare' } }
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors[0].message).toContain('Comparison operator is required')
	})

	it('should fail if comparison operator is invalid', async () => {
		const schema = { value: { type: 'compare', comparison: 'invalid' } }
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors[0].message).toContain('Incorrect comparison type')
	})

	it('should compare against static comparisonValue', async () => {
		const schema = { value: { type: 'compare', comparison: 'eq', value: 10 } }
		const errors = await v.validate({ value: 10 }, schema)
		expect(errors).toEqual([])
	})

	it('should compare against another field in data', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'eq', field: 'other' },
			other: { type: 'number' }
		}
		const errors = await v.validate({ value: 5, other: 5 }, schema)
		expect(errors).toEqual([])
	})

	it('should fail if field does not exist in data', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'eq', field: 'missing' }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors[0].message).toContain('Incorrect field')
	})

	it('should respect strict type check', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'eq', value: '5', strict: true }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors[0].message).toContain('must be the same type')
	})

	it('should handle eq failing with comparisonValue', async () => {
		const schema = { value: { type: 'compare', comparison: 'eq', value: 20 } }
		const errors = await v.validate({ value: 10 }, schema)
		expect(errors[0].message).toContain('must be equal to')
	})

	it('should handle gt passing with field reference', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'gt', field: 'min' },
			min: { type: 'number' }
		}
		const errors = await v.validate({ value: 10, min: 5 }, schema)
		expect(errors).toEqual([])
	})

	it('should handle gt failing with field reference', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'gt', field: 'min' },
			other: { type: 'number' }
		}
		const errors = await v.validate({ value: 2, min: 5 }, schema)
		expect(errors[0].message).toContain('must be greater than')
	})

	it('should not fall back to comparisonValue when field value is 0', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'eq', field: 'other', value: 123 },
			other: { type: 'number' }
		}
		const errors = await v.validate({ value: 0, other: 0 }, schema)
		expect(errors).toEqual([])
	})

	it('should not fall back to comparisonValue when field value is false', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'eq', field: 'flag', value: true },
			flag: { type: 'boolean' }
		}
		const errors = await v.validate({ value: false, flag: false }, schema)
		expect(errors).toEqual([])
	})

	it('should handle ne (not equal)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'ne', value: 5 }
		}
		const errors = await v.validate({ value: 10 }, schema)
		expect(errors).toEqual([]) // porque 10 != 5
	})

	it('should handle lt (less than)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'lt', value: 10 }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors).toEqual([]) // 5 < 10
	})

	it('should handle lte (less than or equal)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'lte', value: 10 }
		}
		const errors = await v.validate({ value: 10 }, schema)
		expect(errors).toEqual([]) // 10 <= 10
	})

	it('should handle gte (greater than or equal)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'gte', value: 5 }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors).toEqual([]) // 5 >= 5
	})

	it('should handle equal (alias of eq)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'equal', value: 7 }
		}
		const errors = await v.validate({ value: 7 }, schema)
		expect(errors).toEqual([])
	})

	it('should handle notEqual (alias of ne)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'notEqual', value: 7 }
		}
		const errors = await v.validate({ value: 9 }, schema)
		expect(errors).toEqual([])
	})

	it('should handle greaterThan (alias of gt)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'greaterThan', value: 3 }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors).toEqual([])
	})

	it('should handle greaterThanOrEqual (alias of gte)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'greaterThanOrEqual', value: 5 }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors).toEqual([])
	})

	it('should handle lessThan (alias of lt)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'lessThan', value: 5 }
		}
		const errors = await v.validate({ value: 3 }, schema)
		expect(errors).toEqual([])
	})

	it('should handle lessThanOrEqual (alias of lte)', async () => {
		const schema = {
			value: { type: 'compare', comparison: 'lessThanOrEqual', value: 5 }
		}
		const errors = await v.validate({ value: 5 }, schema)
		expect(errors).toEqual([])
	})
})
