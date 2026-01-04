import { deepMerge } from './deepMerge'
import { getTimeInSeconds } from './getTimeInSeconds'
import {
	buildPaginationMeta,
	normalizePagination,
	PAGINATION_DEFAULTS,
	validatePaginationInput
} from './pagination'

export const utils = {
	deepMerge,
	getTimeInSeconds,
	pagination: {
		normalize: normalizePagination,
		buildMeta: buildPaginationMeta,
		validate: validatePaginationInput,
		defaults: PAGINATION_DEFAULTS
	}
}

export type UtilityMap = typeof utils
