import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

/**
 * @const authLoginUseCaseRules
 * @description Defines the validation rules for the AuthLoginUseCase's input data.
 */
export const authLoginUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		email: {
			type: 'email',
			normalize: true
		},
		password: {
			type: 'string',
			empty: false
		}
	}
}
