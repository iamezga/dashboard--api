/**
 * NodemailerProvider
 * Production-ready SMTP provider using Nodemailer.
 */
import { EmailProviderError } from '@/errors'
import { EmailSendOptions } from '@/types/services'
import nodemailer, { Transporter } from 'nodemailer'
import { Logger } from 'pino'
import { BaseEmailProvider } from './BaseEmailProvider'

export type NodemailerConfig = {
	host: string
	port: number
	secure: boolean
	auth: {
		user: string
		pass: string
	}
	from: string
}

export class NodemailerProvider extends BaseEmailProvider {
	readonly name = 'nodemailer'
	private transporter: Transporter | null = null

	constructor(private readonly config: NodemailerConfig, logger: Logger) {
		super(logger)
	}

	private getTransporter(): Transporter {
		if (this.transporter) return this.transporter

		this.transporter = nodemailer.createTransport({
			host: this.config.host,
			port: this.config.port,
			secure: this.config.secure,
			auth: {
				user: this.config.auth.user,
				pass: this.config.auth.pass
			}
		})

		return this.transporter
	}

	async send(options: EmailSendOptions): Promise<void> {
		try {
			const to = this.ensureRecipients(options.to)
			const cc = this.normalizeRecipients(options.cc || [])
			const bcc = this.normalizeRecipients(options.bcc || [])
			const text = this.ensureText(options.html, options.text)

			const transporter = this.getTransporter()

			await transporter.sendMail({
				from: options.from || this.config.from,
				to,
				cc,
				bcc,
				subject: options.subject,
				html: options.html,
				text,
				replyTo: options.replyTo,
				attachments: options.attachments?.map(att => ({
					filename: att.filename,
					content: att.content,
					contentType: att.contentType
				}))
			})

			this.logger.info(
				{ provider: this.name, to, cc, bcc },
				'Email sent via Nodemailer'
			)
		} catch (error) {
			this.handleError(error, options)
		}
	}

	async verify(): Promise<void> {
		try {
			const transporter = this.getTransporter()
			await transporter.verify()
			this.logger.info(
				{ provider: this.name, host: this.config.host },
				'Nodemailer provider verified'
			)
		} catch (error) {
			throw new EmailProviderError(
				'Failed to verify SMTP configuration',
				this.name,
				error instanceof Error ? error : undefined
			)
		}
	}
}
