import { getTimeInSeconds } from './getTimeInSeconds'

describe('getTimeInSeconds', () => {
	it('should convert string duration to seconds when ms returns positive value', () => {
		const result = getTimeInSeconds('1m', 99)
		expect(result).toBe(60)
	})

	it('should return defaultValue when ms returns 0 for a string', () => {
		const result = getTimeInSeconds('invalid', 42)
		expect(result).toBe(42)
	})

	it('should return the same number if value is non-zero number', () => {
		const result = getTimeInSeconds(120, 77)
		expect(result).toBe(120)
	})

	it('should return defaultValue when value is number 0', () => {
		const result = getTimeInSeconds('1h')
		expect(result).toBe(3600)
	})

	it('should return defaultValue when value is number 0', () => {
		const result = getTimeInSeconds(0, 33)
		expect(result).toBe(33)
	})
})
