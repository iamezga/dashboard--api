import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

export const authPasswordRecoveryVerifyUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		token: {
			type: 'string',
			empty: false,
			min: 64, // 32 bytes hex = 64 characters
			max: 64,
			messages: {
				required: 'Recovery token is required',
				string: 'Token must be a string',
				stringEmpty: 'Token cannot be empty',
				stringMin: 'Invalid token format',
				stringMax: 'Invalid token format'
			}
		}
	}
}
