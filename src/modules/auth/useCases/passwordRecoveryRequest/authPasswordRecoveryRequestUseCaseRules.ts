import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

export const authPasswordRecoveryRequestUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		email: {
			type: 'email',
			normalize: true,
			messages: {
				required: 'Email is required',
				email: 'Email must be a valid email address'
			}
		}
	}
}
