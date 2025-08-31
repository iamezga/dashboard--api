import { ValidationError } from 'fastest-validator'
import { validator } from '../validationService'

describe('multiAll alias (ValidationService)', () => {
	it('should pass when all rules are valid', async () => {
		const schema = {
			value: {
				type: 'multiAll',
				rules: [{ type: 'string' }, { type: 'string', min: 3 }]
			}
		}

		const result: ValidationError[] = await validator.validate(
			{ value: 'hello' },
			schema
		)

		expect(result).toEqual([])
	})

	it('should fail when at least one rule fails', async () => {
		const schema = {
			value: {
				type: 'multiAll',
				rules: [{ type: 'string' }, { type: 'string', min: 10 }]
			}
		}

		const result: ValidationError[] = await validator.validate(
			{ value: 'short' },
			schema
		)

		expect(result.length).toBe(1)
		expect(result[0].field).toBe('value')
	})

	it('should fail when all rules fail', async () => {
		const schema = {
			value: {
				type: 'multiAll',
				rules: [{ type: 'string' }, { type: 'string', min: 5 }]
			}
		}

		const result: ValidationError[] = await validator.validate(
			{ value: 123 },
			schema
		)

		expect(result.length).toBe(2)
		expect(result.every(e => e.field === 'value')).toBe(true)
	})

	it('should pass if value is missing and optional is true', async () => {
		const schema = {
			value: {
				type: 'multiAll',
				rules: [{ type: 'string' }],
				optional: true
			}
		}

		const result: ValidationError[] = await validator.validate({}, schema)

		expect(result).toEqual([])
	})

	it('should work with nested paths', async () => {
		const schema = {
			nested: {
				type: 'object',
				props: {
					value: { type: 'multiAll', rules: [{ type: 'string' }] }
				}
			}
		}

		const result: ValidationError[] = await validator.validate(
			{ nested: { value: 'ok' } },
			schema
		)

		expect(result).toEqual([])
	})

	it('should use only the field name in errors for nested properties', async () => {
		const schema = {
			a: {
				$$type: 'object',
				b: {
					type: 'multiAll',
					rules: [{ type: 'number' }]
				}
			}
		}

		const data = { a: { b: 'not-a-number' } }

		const errors = await validator.validate(data, schema)

		// The error field should be 'b', not 'a.b'
		expect(errors).toHaveLength(1)
		expect(errors[0].field).toBe('b')
		expect(errors[0].message).toBeDefined()
	})
})
