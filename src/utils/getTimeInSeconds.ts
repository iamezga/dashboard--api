import ms, { StringValue } from 'ms'

/**
 *
 * @param value - value to convert
 * @param defaultValue - number in seconds
 * @returns
 */
export const getTimeInSeconds = (
	value: number | string,
	defaultValue: number = 0
): number => {
	if (typeof value === 'string') {
		const msValue = ms(value as StringValue)
		return !isNaN(msValue) && msValue !== 0 ? msValue / 1000 : defaultValue
	}
	// Assume number is already in seconds, which is a good standard
	return !isNaN(value) && value !== 0 ? value : defaultValue
}
