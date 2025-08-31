import { ValidationError } from 'fastest-validator'
import op from 'object-path'
import { ValidationContextInterface } from '../validationService'

/**
 * @alias multiAll
 * @description
 * Custom alias that validates a value against multiple rules.
 * Unlike `multi` in Fastest Validator, which passes if at least one rule is valid,
 * `multiAll` requires **all rules** to pass. If at least one rule fails, an error is returned.
 *
 * @example
 * const schema = {
 *   value: { type: 'multiAll', rules: [{ type: 'string' }, { type: 'string', min: 3 }] }
 * }
 * const errors = await validator.validate({ value: 'hello' }, schema)
 * // errors === []
 */
export const multiAll = {
	type: 'custom',
	async check(
		_value: any,
		errors: ValidationError[],
		schema: Record<string, any>,
		path: string,
		data: Record<string, any>,
		context: ValidationContextInterface
	) {
		const { rules } = schema
		const { meta } = context

		const splittedPath = path.split('.')
		const currentPath = splittedPath.length > 1 ? splittedPath.pop() : ''
		for (const rule of rules) {
			const ruleErrors = await meta.validator.validate(
				data,
				{
					$$strict: false,
					[currentPath || path]: rule
				},
				meta
			)
			if (ruleErrors.length) {
				errors.push(...ruleErrors)
			}
		}

		return op.get(context.data, path)
	}
}
