import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

export const membershipSelectUseCaseRules: UseCaseRules = {
	// Rules to validate `job.data` (payload)
	data: {
		id: {
			type: 'uuid'
		}
	}
}
