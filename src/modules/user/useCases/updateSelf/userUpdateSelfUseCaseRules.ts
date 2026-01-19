import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

/**
 * @const userUpdateSelfUseCaseRules
 * @description Defines the validation rules for the UserUpdateSelfUseCase.
 * Note: Does NOT include id, roleId, or active fields as users cannot modify these
 * on their own profile.
 */
export const userUpdateSelfUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		name: {
			type: 'string',
			optional: true,
			min: 1,
			max: 100
		},
		surname: {
			type: 'string',
			optional: true,
			min: 1,
			max: 100
		},
		email: {
			type: 'email',
			optional: true,
			max: 255
		},
		config: {
			type: 'object',
			optional: true
		}
	}
}
