import { ValidationError } from 'fastest-validator'
import { ValidationService } from './validationService'

describe('ValidationService', () => {
	let validator: ValidationService
	beforeEach(() => {
		// new instance for each test
		validator = new ValidationService()
	})

	it('should cache compiled schemas', () => {
		const schema = { name: 'string' }
		const compiledCheck1 = validator.compile(schema)
		const compiledCheck2 = validator.compile(schema)

		// check same compilation
		expect(compiledCheck1).toBe(compiledCheck2)
		// check cache
		expect((validator as any)._cache[JSON.stringify(schema)]).toBeDefined()
	})

	it('should compile different schemas independently', () => {
		const schema1 = { name: 'string' }
		const schema2 = { age: 'number' }

		const compiledCheck1 = validator.compile(schema1)
		const compiledCheck2 = validator.compile(schema2)

		// confirm different compilations
		expect(compiledCheck1).not.toBe(compiledCheck2)
		// Check both cached schemes
		expect((validator as any)._cache[JSON.stringify(schema1)]).toBeDefined()
		expect((validator as any)._cache[JSON.stringify(schema2)]).toBeDefined()
	})

	it('should return an empty array for valid data', async () => {
		const schema = { name: 'string', age: 'number' }
		const data = { name: 'John Doe', age: 30 }

		const errors = await validator.validate(data, schema)

		expect(errors).toEqual([])
	})

	it('should return an array of errors for invalid data', async () => {
		const schema = { name: 'string', age: 'number' }
		const data = { name: 123, age: 'thirty' }

		const errors = await validator.validate(data, schema)

		expect(Array.isArray(errors)).toBe(true)
		expect(errors.length).toBeGreaterThan(0)
		expect(errors[0]).toHaveProperty('message')
		expect(errors[0]).toHaveProperty('field')
	})

	it('should handle nested validation schemas', async () => {
		const schema = {
			user: {
				type: 'object',
				props: {
					name: 'string',
					email: 'email'
				}
			}
		}
		const data = { user: { name: 'Jane', email: 'jane@example.com' } }

		const errors = await validator.validate(data, schema)
		expect(errors).toEqual([])

		const invalidData = { user: { name: 123, email: 'invalid' } }
		const invalidErrors = await validator.validate(invalidData, schema)
		expect(invalidErrors.length).toBeGreaterThan(0)
	})

	it('should pass meta data to the validator', async () => {
		const schema = { name: 'customEnum' }
		const data = { name: 'Test' }
		const metaData = { userId: 123 }

		const customAlias = {
			type: 'custom',
			async check(
				value: any,
				errors: ValidationError[],
				_schema: Record<string, any>,
				_path: string,
				_data: Record<string, any>,
				context: { meta: { [key: string]: any; validator: ValidationService } }
			) {
				const { validator } = context.meta
				const newSchema = {
					name: {
						type: 'enum',
						values: ['test', 'jest']
					}
				}

				const newErrors = await validator.validate({ name: value }, newSchema)
				if (newErrors.length) {
					errors.push(...newErrors)
				}

				return value
			}
		}

		validator.alias('customEnum', customAlias)

		const errors = await validator.validate(data, schema, metaData)
		expect(errors).not.toEqual([])
		expect(errors[0]).toHaveProperty('message')
		expect(errors[0].message).toEqual(
			"The 'name' field value 'test, jest' does not match any of the allowed values."
		)
	})
})
