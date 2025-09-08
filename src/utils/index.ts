import { deepMerge } from './deepMerge'
import { getTimeInSeconds } from './getTimeInSeconds'

export const utils = {
	deepMerge,
	getTimeInSeconds
}

export type UtilityMap = typeof utils
