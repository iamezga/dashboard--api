import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'

/**
 * Validation rules for logout use case
 * No payload validation needed as sessionId comes from authenticated token metadata
 */
export const authLogoutUseCaseRules: UseCaseRules = {
	data: {}
}
