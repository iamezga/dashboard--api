import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

/**
 * @const userUpdateUseCaseRules
 * @description Defines the validation rules for the UserUpdateUseCase.
 */
export const userUpdateUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		id: {
			type: 'uuid'
		},
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
		roleId: {
			type: 'uuid',
			optional: true
		},
		active: {
			type: 'boolean',
			optional: true
		},
		config: {
			type: 'object',
			optional: true
		}
	}
}
