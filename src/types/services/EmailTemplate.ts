/**
 * @interface EmailTemplate
 * @description Defines a reusable email template with structure and composition.
 *
 * Architecture Pattern:
 * - Templates are composable (can include other templates)
 * - Supports variables for dynamic content
 * - Separates content (what to send) from delivery (how to send it)
 * - Makes it easy to maintain email content independently from code
 *
 * @example
 * ```typescript
 * export const welcomeTemplate: EmailTemplate = {
 *   id: 'welcome-email',
 *   name: 'Welcome Email',
 *   subject: 'Welcome to {{appName}}!',
 *   htmlPath: '/templates/welcome.html',
 *   textPath: '/templates/welcome.txt',
 *   requiredVariables: ['firstName', 'confirmLink'],
 *   category: 'onboarding'
 * }
 * ```
 */
export interface EmailTemplate {
	/**
	 * Unique identifier for this template.
	 * Used to reference the template when sending emails.
	 * @example 'welcome-email', 'password-reset', 'invoice'
	 */
	id: string

	/**
	 * Human-readable name of the template.
	 * Used for logging and admin interfaces.
	 * @example 'Welcome Email for New Users'
	 */
	name: string

	/**
	 * Email subject line template.
	 * Supports variable interpolation.
	 * @example 'Welcome to {{appName}}, {{firstName}}!'
	 */
	subject: string

	/**
	 * HTML content of the email template.
	 * Can be:
	 * - Inline HTML string
	 * - Path to HTML file (relative to template directory)
	 * @example '<h1>Welcome {{firstName}}</h1>'
	 */
	html: string

	/**
	 * Plain text version of the email (optional).
	 * If not provided, will be auto-generated from HTML.
	 * Important for accessibility and clients that don't support HTML.
	 * @example 'Welcome {{firstName}}'
	 */
	text?: string

	/**
	 * List of variables that MUST be provided when sending this template.
	 * Helps catch missing data early.
	 * @example ['firstName', 'confirmationLink', 'expiryTime']
	 */
	requiredVariables?: string[]

	/**
	 * Optional variables that may be used in the template.
	 * Used for validation and documentation.
	 * @example ['company', 'phoneNumber']
	 */
	optionalVariables?: string[]

	/**
	 * Category/group for organizing templates.
	 * Useful for analytics and reporting.
	 * @example 'authentication', 'notifications', 'marketing'
	 */
	category?: string

	/**
	 * Default sender email for this template (optional).
	 * If not specified, uses provider's default.
	 * @example 'noreply@example.com'
	 */
	defaultFrom?: string

	/**
	 * Default reply-to address (optional).
	 * @example 'support@example.com'
	 */
	defaultReplyTo?: string

	/**
	 * Tags for filtering and analytics (optional).
	 * @example ['transactional', 'user-signup']
	 */
	tags?: string[]

	/**
	 * Description of what this template is used for.
	 * Helpful for maintenance and documentation.
	 * @example 'Sent when user signs up to confirm their email address'
	 */
	description?: string
}

/**
 * @interface RenderedEmailTemplate
 * @description Result of rendering a template with data.
 * This is what's passed to the email provider for sending.
 */
export interface RenderedEmailTemplate {
	/**
	 * Rendered subject with variables replaced
	 */
	subject: string

	/**
	 * Rendered HTML content
	 */
	html: string

	/**
	 * Rendered plain text content
	 */
	text: string

	/**
	 * Original template ID (for tracking/logging)
	 */
	templateId: string

	/**
	 * Timestamp of when template was rendered
	 */
	renderedAt: Date
}

/**
 * @interface EmailTemplateRegistry
 * @description Registry/map of available email templates.
 * Allows looking up templates by ID and validating data.
 */
export interface EmailTemplateRegistry {
	/**
	 * Get a template by ID
	 * @throws Error if template not found
	 */
	get(id: string): EmailTemplate

	/**
	 * Register a new template
	 */
	register(template: EmailTemplate): void

	/**
	 * Check if template exists
	 */
	has(id: string): boolean

	/**
	 * Get all registered templates
	 */
	getAll(): EmailTemplate[]

	/**
	 * Get templates by category
	 */
	getByCategory(category: string): EmailTemplate[]

	/**
	 * Validate that data has all required variables for a template
	 * @throws Error if required variables missing
	 */
	validateData(templateId: string, data: Record<string, any>): void

	/**
	 * Render a template with provided data
	 */
	render(templateId: string, data: Record<string, any>): RenderedEmailTemplate
}
