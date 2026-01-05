/**
 * @class EmailProviderError
 * @extends Error
 * @description Represents an error that occurs during email sending operations.
 * This error wraps underlying provider errors (SMTP, SendGrid, etc.) and provides
 * a consistent interface for email-related failures.
 *
 * Use cases:
 * - SMTP connection failures
 * - Invalid email configuration
 * - Provider API errors (SendGrid, Nodemailer, etc.)
 * - Email template rendering failures
 * - Attachment processing errors
 *
 * @example
 * ```typescript
 * try {
 *   await transporter.sendMail(options)
 * } catch (error) {
 *   throw new EmailProviderError(
 *     'Failed to send welcome email',
 *     'nodemailer',
 *     error
 *   )
 * }
 * ```
 */
export class EmailProviderError extends Error {
	/**
	 * Creates a new EmailProviderError instance.
	 *
	 * @param {string} message - Description of the email provider failure
	 * @param {string} provider - Name of the email provider (e.g., 'nodemailer', 'sendgrid')
	 * @param {Error} [originalError] - Original error from the provider
	 */
	constructor(
		message: string,
		public readonly provider: string,
		public readonly originalError?: Error
	) {
		super(message)
		this.name = 'EmailProviderError'
	}
}
