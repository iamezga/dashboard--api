import Validator, {
	AsyncCheckFunction,
	SyncCheckFunction,
	ValidationSchema,
	ValidatorConstructorOptions
} from 'fastest-validator'

export class ValidationService extends Validator {
	private _cache: Record<string, SyncCheckFunction | AsyncCheckFunction> = {}

	constructor(options?: ValidatorConstructorOptions) {
		super({
			...options,
			useNewCustomCheckerFunction: true // using new version
		})
	}

	compile(schema: ValidationSchema | ValidationSchema[]) {
		const key = JSON.stringify(schema)
		if (!this._cache[key]) {
			this._cache[key] = super.compile(schema)
		}
		return this._cache[key]
	}

	async validate(
		value: any,
		schema: ValidationSchema,
		meta: { [key: string]: any; validator?: ValidationService } = {}
	) {
		const check = this.compile({ $$async: true, $$strict: true, ...schema })
		const errors = await check(value, { meta: { ...meta, validator: this } })
		return Array.isArray(errors) ? errors : []
	}
}

const validator = new ValidationService()

export { validator }
