import { ValidationError, ValidationRuleObject } from 'fastest-validator'
import op from 'object-path'
import { ValidationContextInterface } from '../validationService'

/**
 * @alias compare
 * @description
 * Custom alias for Fastest Validator that compares a field's value with either a static value
 * or another field in the data object. Supports multiple comparison operators (`eq`, `ne`, `gt`, `lt`, `gte`, `lte`)
 * and optional strict type checking.
 *
 * @param {any} value - Value of the field being validated.
 * @param {ValidationError[]} errors - Array to push validation errors.
 * @param {Record<string, any>} schema - Validation schema containing:
 *   - `field?: string` - Path to another field in the data object to compare with.
 *   - `value?: any` - Static value to compare with.
 *   - `comparison: string` - Comparison operator ('eq', 'ne', 'gt', 'lt', 'gte', 'lte').
 *   - `strict?: boolean` - If true, value and compareTo must have the same primitive type.
 * @param {string} path - Path of the field being validated.
 * @param {Record<string, any>} _data - Full object being validated.
 * @param {ValidationContextInterface} context - Context containing metadata such as the validator instance.
 *
 * @returns {any} The validated value.
 *
 * @example
 * const schema = {
 *   age: { type: 'compare', comparison: 'gt', field: 'minAge' }
 * }
 * const errors = await validator.validate({ age: 20, minAge: 18 }, schema)
 * // errors === []
 */
export const compare: ValidationRuleObject = {
	type: 'custom',
	async check(
		value: any,
		errors: ValidationError[],
		schema: Record<string, any>,
		path: string,
		_data: Record<string, any>,
		context: ValidationContextInterface
	) {
		const { field, value: comparisonValue, comparison, strict } = schema

		const hasSamePrimitiveType = (a: any, b: any): boolean => {
			const isObjectA = a !== null && typeof a === 'object'
			const isObjectB = b !== null && typeof b === 'object'

			if (isObjectA && isObjectB) {
				return Object.getPrototypeOf(a) === Object.getPrototypeOf(b)
			}

			if (!isObjectA && !isObjectB) {
				return typeof a === typeof b
			}

			return false
		}

		const types = {
			eq: { label: 'equal to', eval: (a: any, b: any) => a == b },
			ne: { label: 'not equal to', eval: (a: any, b: any) => a != b },
			gt: { label: 'greater than', eval: (a: any, b: any) => a > b },
			lt: { label: 'less than', eval: (a: any, b: any) => a < b },
			gte: {
				label: 'greater than or equal to',
				eval: (a: any, b: any) => a >= b
			},
			lte: { label: 'less than or equal to', eval: (a: any, b: any) => a <= b },
			equal: { label: 'equal to', eval: (a: any, b: any) => a == b },
			notEqual: { label: 'not equal to', eval: (a: any, b: any) => a != b },
			greaterThan: { label: 'greater than', eval: (a: any, b: any) => a > b },
			greaterThanOrEqual: {
				label: 'greater than or equal to',
				eval: (a: any, b: any) => a >= b
			},
			lessThan: { label: 'less than', eval: (a: any, b: any) => a < b },
			lessThanOrEqual: {
				label: 'less than or equal to',
				eval: (a: any, b: any) => a <= b
			}
		}

		// Comparison operator required
		if (!comparison) {
			errors.push({
				type: 'compare',
				field: path,
				message: 'Comparison operator is required.'
			})
			return value
		}

		// Get field value or fallback
		if (field && (!context.data || !op.has(context.data, field))) {
			errors.push({
				type: 'compare',
				field: path,
				message: 'Incorrect field.',
				actual: field
			})
			return value
		}

		if (!(comparison in types)) {
			errors.push({
				type: 'compare',
				field: path,
				message: 'Incorrect comparison type.',
				actual: comparison,
				expected: Object.keys(types)
			})
			return value
		}

		const compareTo =
			field !== undefined ? op.get(context.data, field) : comparisonValue

		// Strict type check
		if (strict && !hasSamePrimitiveType(value, compareTo)) {
			errors.push({
				type: 'compare',
				field: path,
				message: `${path} must be the same type of ${field || 'value'}`,
				actual: value,
				comparedTo: compareTo
			} as ValidationError & { comparedTo: string })
			return value
		}

		const type = comparison as keyof typeof types
		if (!types[type].eval(value, compareTo)) {
			errors.push({
				type: 'compare',
				message: `${path} must be ${types[type].label} ${field || 'value'}.`,
				field: path,
				actual: value,
				comparedTo: compareTo
			} as ValidationError & { comparedTo: string })
		}

		return value
	}
}
