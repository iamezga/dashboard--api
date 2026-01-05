import { UseCaseRules } from '@/types/useCase/UseCaseRulesInterface'
import { PAGINATION_DEFAULTS } from '@/utils/pagination'

export const auditFindUseCaseRules: UseCaseRules = {
	data: {
		id: {
			type: 'string',
			optional: true,
			empty: false
		},
		action: {
			type: 'string',
			optional: true,
			empty: false
		},
		jobId: {
			type: 'string',
			optional: true,
			empty: false
		},
		userId: {
			type: 'string',
			optional: true,
			empty: false
		},
		userEmail: {
			type: 'email',
			optional: true
		},
		organizationId: {
			type: 'string',
			optional: true,
			empty: false
		},
		resourceType: {
			type: 'string',
			optional: true,
			empty: false
		},
		resourceId: {
			type: 'string',
			optional: true,
			empty: false
		},
		ip: {
			type: 'string',
			optional: true,
			empty: false
		},
		startDate: {
			type: 'string',
			optional: true,
			pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
			messages: {
				stringPattern: 'Start date must be a valid ISO date string'
			}
		},
		endDate: {
			type: 'string',
			optional: true,
			pattern: /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?)?$/,
			messages: {
				stringPattern: 'End date must be a valid ISO date string'
			}
		},
		page: {
			type: 'number',
			optional: true,
			integer: true,
			min: 1,
			default: PAGINATION_DEFAULTS.PAGE,
			messages: {
				number: 'Page must be a number',
				numberInteger: 'Page must be an integer',
				numberMin: 'Page must be at least 1'
			}
		},
		limit: {
			type: 'number',
			optional: true,
			integer: true,
			min: PAGINATION_DEFAULTS.MIN_LIMIT,
			max: PAGINATION_DEFAULTS.MAX_LIMIT,
			default: PAGINATION_DEFAULTS.LIMIT,
			messages: {
				number: 'Limit must be a number',
				numberInteger: 'Limit must be an integer',
				numberMin: `Limit must be at least ${PAGINATION_DEFAULTS.MIN_LIMIT}`,
				numberMax: `Limit must be at most ${PAGINATION_DEFAULTS.MAX_LIMIT}`
			}
		},
		sortBy: {
			type: 'string',
			optional: true,
			empty: false
		},
		sortOrder: {
			type: 'enum',
			optional: true,
			values: ['asc', 'desc'],
			default: PAGINATION_DEFAULTS.SORT_ORDER,
			messages: {
				enumValue: 'Sort order must be either "asc" or "desc"'
			}
		}
	}
}
