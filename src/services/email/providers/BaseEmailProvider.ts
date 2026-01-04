/**
 * Base class for email providers.
 * Provides common helpers for validation, normalization and error handling.
 * Implementations (Log, Nodemailer, SendGrid, etc.) should extend this class.
 */
import { EmailProviderError } from '@/errors'
import { EmailProvider, EmailSendOptions } from '@/types/services'
import { Logger } from 'pino'

export abstract class BaseEmailProvider implements EmailProvider {
	abstract readonly name: string

	protected constructor(protected readonly logger: Logger) {}

	abstract send(options: EmailSendOptions): Promise<void>
	abstract verify(): Promise<void>

	/** Normalize recipients to an array of trimmed strings */
	protected normalizeRecipients(recipients: string | string[]): string[] {
		if (!recipients) return []
		const list = Array.isArray(recipients) ? recipients : [recipients]
		return list.map(r => r.trim()).filter(Boolean)
	}

	/** Ensure recipients exist and are valid emails */
	protected ensureRecipients(recipients: string | string[]): string[] {
		const list = this.normalizeRecipients(recipients)
		if (!list.length) {
			throw new EmailProviderError('No recipients provided', this.name)
		}
		const invalid = list.filter(r => !this.isValidEmail(r))
		if (invalid.length) {
			throw new EmailProviderError(
				`Invalid recipient emails: ${invalid.join(', ')}`,
				this.name
			)
		}
		return list
	}

	/** Basic email validation */
	protected isValidEmail(email: string): boolean {
		// Simple RFC 5322-lite regex
		return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
	}

	/** Create a plain-text fallback if not provided */
	protected ensureText(html?: string, text?: string): string | undefined {
		if (text) return text
		if (!html) return undefined
		// Minimal HTML strip for fallback; providers can override
		return html
			.replace(/<[^>]*>/g, '')
			.replace(/\s+/g, ' ')
			.trim()
	}

	/** Centralized error handling for providers */
	protected handleError(
		error: unknown,
		context?: Partial<EmailSendOptions>
	): void {
		const err = error instanceof Error ? error : new Error(String(error))
		this.logger.error(
			{ err, provider: this.name, context },
			'Email provider error'
		)
	}
}
