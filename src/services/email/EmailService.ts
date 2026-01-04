/**
 * EmailService
 * Facade over email providers and template registry.
 * Handles template rendering, provider selection, and error logging.
 */
import {
	EmailProvider,
	EmailSendOptions,
	EmailServiceInterface,
	EmailTemplate,
	EmailTemplateRegistry,
	TemplateEmailOptions
} from '@/types/services'
import { Logger } from 'pino'
import { InMemoryEmailTemplateRegistry } from './EmailTemplateRegistry'

export class EmailService implements EmailServiceInterface {
	constructor(
		private readonly provider: EmailProvider,
		private readonly logger: Logger,
		private readonly templates: EmailTemplateRegistry = new InMemoryEmailTemplateRegistry()
	) {}

	async send(options: TemplateEmailOptions): Promise<void> {
		try {
			const template = this.templates.get(options.templateId)
			this.templates.validateData(
				options.templateId,
				options.templateData || {}
			)

			const rendered = this.templates.render(
				options.templateId,
				options.templateData || {}
			)

			const sendOptions: EmailSendOptions = {
				to: options.to,
				subject: rendered.subject,
				html: rendered.html,
				text: rendered.text,
				templateId: template.id,
				templateData: options.templateData,
				from: options.from || template.defaultFrom,
				replyTo: options.replyTo || template.defaultReplyTo,
				cc: options.cc,
				bcc: options.bcc,
				metadata: options.metadata
			}

			await this.provider.send(sendOptions)
		} catch (error) {
			this.logger.error({ err: error, options }, 'EmailService.send failed')
		}
	}

	async sendHtml(options: EmailSendOptions): Promise<void> {
		try {
			await this.provider.send(options)
		} catch (error) {
			this.logger.error({ err: error, options }, 'EmailService.sendHtml failed')
		}
	}

	registerTemplate(template: EmailTemplate): void {
		this.templates.register(template)
	}

	getTemplateRegistry(): EmailTemplateRegistry {
		return this.templates
	}

	getProvider(): EmailProvider {
		return this.provider
	}
}
