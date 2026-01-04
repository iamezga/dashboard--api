import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

export const authPasswordResetUseCaseRules: UseCaseRules = {
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
		},
		password: {
			type: 'string',
			min: 8,
			max: 128,
			messages: {
				required: 'Password is required',
				string: 'Password must be a string',
				stringMin: 'Password must be at least 8 characters long',
				stringMax: 'Password must be at most 128 characters long'
			}
		}
	}
}
