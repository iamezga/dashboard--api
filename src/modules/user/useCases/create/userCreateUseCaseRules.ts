import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

/**
 * @const userCreateUseCaseRules
 * @description Defines the validation rules for the UserCreateUseCase.
 */
export const userCreateUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		name: {
			type: 'string',
			empty: false,
			trim: true
		},
		surname: {
			type: 'string',
			empty: true, // Surname can be empty
			trim: true,
			optional: true
		},
		email: {
			type: 'email',
			normalize: true
		},
		password: {
			type: 'string',
			empty: false,
			trim: true,
			min: 8 // TODO define rules
		},
		organizationId: {
			type: 'uuid'
		},
		roleId: {
			type: 'uuid'
		},
		active: {
			type: 'boolean',
			optional: true,
			default: true
		},
		config: {
			type: 'object',
			optional: true,
			default: {}
		}
	}
}
