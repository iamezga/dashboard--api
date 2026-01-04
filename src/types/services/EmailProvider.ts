/**
 * @interface EmailProvider
 * @description Base contract that all email providers must implement.
 * This allows different email services (Nodemailer, SendGrid, Resend, etc.)
 * to be used interchangeably without changing application code.
 *
 * Architecture Pattern:
 * - Each provider implements this interface
 * - Providers are configured via environment variables
 * - The main EmailService acts as a facade selecting the appropriate provider
 * - Constructor injection ensures all dependencies are available at instantiation
 *
 * @example
 * ```typescript
 * export class NodemailerProvider implements EmailProvider {
 *   name = 'nodemailer'
 *
 *   async send(options: EmailSendOptions): Promise<void> {
 *     // Implementation
 *   }
 * }
 * ```
 */
export interface EmailProvider {
	/**
	 * Unique identifier for this provider.
	 * Used for logging, selection, and debugging.
	 * @example 'nodemailer', 'sendgrid', 'resend'
	 */
	readonly name: string

	/**
	 * Sends an email using this provider.
	 *
	 * @param options - Email sending configuration and data
	 * @throws {EmailProviderError} If email fails to send
	 * @returns Promise that resolves when email is sent (or queued)
	 *
	 * @remarks
	 * - Should NOT throw errors (log them instead) - failed emails shouldn't block main flow
	 * - Should validate email addresses before sending
	 * - Should support batch sending (array of recipients)
	 */
	send(options: EmailSendOptions): Promise<void>

	/**
	 * Tests the provider connection/credentials.
	 * Useful for startup verification and debugging.
	 *
	 * @returns Promise that resolves if provider is properly configured
	 * @throws {EmailProviderError} If configuration is invalid
	 */
	verify(): Promise<void>
}

/**
 * @interface EmailSendOptions
 * @description Configuration for sending a single email.
 * Supports both template-based and plain text emails.
 */
export interface EmailSendOptions {
	/**
	 * Recipient email address(es).
	 * @example 'user@example.com' or ['user1@example.com', 'user2@example.com']
	 */
	to: string | string[]

	/**
	 * Email subject line.
	 * @example 'Welcome to Our App'
	 */
	subject: string

	/**
	 * Template identifier for rendering.
	 * If provided, 'html' must NOT be provided.
	 * @example 'welcome-email', 'password-reset'
	 */
	templateId?: string

	/**
	 * Data to inject into the template.
	 * Variables are replaced in template using template engine syntax.
	 * @example { firstName: 'John', resetLink: 'https://...' }
	 */
	templateData?: Record<string, any>

	/**
	 * Plain HTML email content.
	 * Use EITHER 'templateId' OR 'html', not both.
	 * @example '<p>Hello {{firstName}}</p>'
	 */
	html?: string

	/**
	 * Plain text fallback (optional but recommended for accessibility).
	 * If not provided, plain text version will be generated from HTML.
	 * @example 'Hello John'
	 */
	text?: string

	/**
	 * Sender email address.
	 * If not provided, uses provider's default 'from' address.
	 * @example 'noreply@example.com'
	 */
	from?: string

	/**
	 * Reply-to email address (optional).
	 * @example 'support@example.com'
	 */
	replyTo?: string

	/**
	 * Carbon copy recipients (optional).
	 * @example 'manager@example.com'
	 */
	cc?: string | string[]

	/**
	 * Blind carbon copy recipients (optional).
	 * @example 'audit@example.com'
	 */
	bcc?: string | string[]

	/**
	 * File attachments (optional).
	 * Not all providers may support attachments.
	 */
	attachments?: EmailAttachment[]

	/**
	 * Custom metadata/tags for tracking and filtering.
	 * Supported differently by each provider.
	 * @example { userId: 'user-123', campaignId: 'welcome-2026' }
	 */
	metadata?: Record<string, string | number>
}

/**
 * @interface EmailAttachment
 * @description Email attachment configuration
 */
export interface EmailAttachment {
	/**
	 * Display name of the attachment
	 * @example 'invoice.pdf'
	 */
	filename: string

	/**
	 * File content as Buffer or string
	 */
	content: Buffer | string

	/**
	 * MIME type of the attachment
	 * @example 'application/pdf'
	 */
	contentType: string
}
