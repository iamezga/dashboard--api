import { EmailProvider, EmailSendOptions } from './EmailProvider'
import { EmailTemplate, EmailTemplateRegistry } from './EmailTemplate'

/**
 * @interface EmailServiceInterface
 * @description Main contract for the email service.
 *
 * Architecture:
 * - Acts as a facade over multiple providers
 * - Handles template rendering
 * - Manages provider selection based on configuration
 * - Provides type-safe, high-level API for sending emails
 *
 * Constructor Injection:
 * - Receives all dependencies in constructor
 * - 100% ready to use immediately after instantiation
 * - No setContext pattern
 *
 * @example
 * ```typescript
 * // Simple send with template
 * await emailService.send({
 *   to: 'user@example.com',
 *   templateId: 'welcome-email',
 *   templateData: { firstName: 'John' }
 * })
 *
 * // Direct HTML send
 * await emailService.sendHtml({
 *   to: 'user@example.com',
 *   subject: 'Welcome',
 *   html: '<h1>Welcome!</h1>'
 * })
 * ```
 */
export interface EmailServiceInterface {
	/**
	 * Send email using a template.
	 *
	 * Process:
	 * 1. Look up template by ID
	 * 2. Validate template data has all required variables
	 * 3. Render template with provided data
	 * 4. Send using active provider
	 *
	 * @param options - Template-based email options
	 * @returns Promise that resolves when email is sent/queued
	 * @remarks Errors are logged but not thrown (non-blocking)
	 */
	send(options: TemplateEmailOptions): Promise<void>

	/**
	 * Send raw HTML email (no template).
	 * Useful for dynamic emails or one-offs.
	 *
	 * @param options - Raw HTML email options
	 * @returns Promise that resolves when email is sent/queued
	 * @remarks Errors are logged but not thrown (non-blocking)
	 */
	sendHtml(options: EmailSendOptions): Promise<void>

	/**
	 * Register a new email template.
	 *
	 * @param template - Template definition
	 * @remarks Templates can be registered at startup or dynamically
	 */
	registerTemplate(template: EmailTemplate): void

	/**
	 * Get template registry for advanced usage.
	 *
	 * @returns Template registry with all registered templates
	 */
	getTemplateRegistry(): EmailTemplateRegistry

	/**
	 * Get active email provider information.
	 *
	 * @returns Active provider instance
	 */
	getProvider(): EmailProvider
}

/**
 * @interface TemplateEmailOptions
 * @description Options for sending template-based emails.
 */
export interface TemplateEmailOptions {
	/**
	 * Recipient email address(es)
	 */
	to: string | string[]

	/**
	 * Template identifier to use
	 * @example 'welcome-email'
	 */
	templateId: string

	/**
	 * Data for template variable substitution
	 * @example { firstName: 'John', confirmLink: 'https://...' }
	 */
	templateData?: Record<string, any>

	/**
	 * Optional carbon copy recipients
	 */
	cc?: string | string[]

	/**
	 * Optional blind carbon copy recipients
	 */
	bcc?: string | string[]

	/**
	 * Optional sender override (defaults to template/provider setting)
	 */
	from?: string

	/**
	 * Optional reply-to override
	 */
	replyTo?: string

	/**
	 * Custom metadata for tracking
	 */
	metadata?: Record<string, string | number>
}
