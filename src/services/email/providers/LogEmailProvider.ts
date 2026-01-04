/**
 * LogEmailProvider
 * Development-only provider that logs emails instead of sending them.
 * Safe for local/testing environments.
 */
import { EmailSendOptions } from '@/types/services'
import { Logger } from 'pino'
import { BaseEmailProvider } from './BaseEmailProvider'

export class LogEmailProvider extends BaseEmailProvider {
	readonly name = 'log'

	constructor(logger: Logger) {
		super(logger)
	}

	async send(options: EmailSendOptions): Promise<void> {
		try {
			const to = this.ensureRecipients(options.to)
			const text = this.ensureText(options.html, options.text)

			this.logger.info(
				{
					provider: this.name,
					to,
					subject: options.subject,
					templateId: options.templateId,
					templateData: options.templateData,
					from: options.from,
					replyTo: options.replyTo,
					cc: this.normalizeRecipients(options.cc || []),
					bcc: this.normalizeRecipients(options.bcc || []),
					metadata: options.metadata,
					html: options.html,
					text
				},
				'[EMAIL LOG] Email captured by LogEmailProvider'
			)
		} catch (error) {
			this.handleError(error, options)
		}
	}

	async verify(): Promise<void> {
		// Nothing to verify for log provider
		this.logger.info({ provider: this.name }, 'LogEmailProvider ready')
	}
}
