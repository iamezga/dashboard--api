/**
 * @class EmailProviderError
 * @description Custom error for email provider failures.
 * Distinguishes email errors from other application errors.
 */
export class EmailProviderError extends Error {
	constructor(
		message: string,
		public readonly provider: string,
		public readonly originalError?: Error
	) {
		super(message)
		this.name = 'EmailProviderError'
	}
}
