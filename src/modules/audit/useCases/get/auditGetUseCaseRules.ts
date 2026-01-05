import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

export const auditGetUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		id: {
			type: 'string',
			optional: false,
			empty: false,
			messages: {
				required: 'Audit ID is required',
				stringEmpty: 'Audit ID cannot be empty'
			}
		}
	}
	//
	/**
	 * Rules to validate `job.user` -
	 * If the use case requires authentication and permission validations, the `user` prop
	 * should be included with the rules
	 * e.g. to validate permissions
	 */
	// user: {
	// $$strict: false,
	// id: {
	// 	type: 'uuid',
	// 	optional: false
	// }
	// },
	// Rules to validate `job.recaptchaResponse` - e.g. recaptchaAlias
	// recaptchaResponse: {},
	// Rules for validating `job.attempts` In case there is any limitation of attempts - e.g. recaptchaAlias
	// attempts: {}
}
