import nodemailer from 'nodemailer'
import { Logger } from 'pino'
import { EmailProviderError } from '../../../errors'
import { EmailSendOptions } from '../../../types/services'
import { NodemailerConfig, NodemailerProvider } from './NodemailerProvider'

jest.mock('nodemailer')

const createLogger = (): Logger => {
	const logger: any = {
		info: jest.fn(),
		error: jest.fn(),
		warn: jest.fn(),
		child: jest.fn()
	}
	logger.child.mockReturnValue(logger)
	return logger as Logger
}

describe('NodemailerProvider', () => {
	let provider: NodemailerProvider
	let logger: Logger
	let config: NodemailerConfig
	let mockTransporter: any

	beforeEach(() => {
		logger = createLogger()
		config = {
			host: 'smtp.test.com',
			port: 587,
			secure: false,
			auth: {
				user: 'test@test.com',
				pass: 'password123'
			},
			from: 'noreply@test.com'
		}

		mockTransporter = {
			sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
			verify: jest.fn().mockResolvedValue(true)
		}
		;(nodemailer.createTransport as jest.Mock).mockReturnValue(mockTransporter)

		provider = new NodemailerProvider(config, logger)
	})

	afterEach(() => {
		jest.clearAllMocks()
	})

	it('has correct provider name', () => {
		expect(provider.name).toBe('nodemailer')
	})

	describe('send', () => {
		it('sends email with all options', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test Email',
				html: '<p>Hello</p>',
				text: 'Hello',
				from: 'custom@test.com',
				replyTo: 'support@test.com',
				cc: 'manager@test.com',
				bcc: ['audit@test.com'],
				attachments: [
					{
						filename: 'test.pdf',
						content: Buffer.from('test'),
						contentType: 'application/pdf'
					}
				]
			}

			await provider.send(options)

			expect(nodemailer.createTransport).toHaveBeenCalledWith({
				host: config.host,
				port: config.port,
				secure: config.secure,
				auth: config.auth
			})

			expect(mockTransporter.sendMail).toHaveBeenCalledWith({
				from: 'custom@test.com',
				to: ['user@test.com'],
				cc: ['manager@test.com'],
				bcc: ['audit@test.com'],
				subject: 'Test Email',
				html: '<p>Hello</p>',
				text: 'Hello',
				replyTo: 'support@test.com',
				attachments: [
					{
						filename: 'test.pdf',
						content: Buffer.from('test'),
						contentType: 'application/pdf'
					}
				]
			})

			expect(logger.info).toHaveBeenCalledWith(
				{
					provider: 'nodemailer',
					to: ['user@test.com'],
					cc: ['manager@test.com'],
					bcc: ['audit@test.com']
				},
				'Email sent via Nodemailer'
			)
		})

		it('uses default from address when not provided', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test',
				html: '<p>Test</p>'
			}

			await provider.send(options)

			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					from: config.from
				})
			)
		})

		it('generates text fallback from HTML when not provided', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test',
				html: '<p>Hello <b>World</b></p>'
			}

			await provider.send(options)

			expect(mockTransporter.sendMail).toHaveBeenCalledWith(
				expect.objectContaining({
					text: 'Hello World'
				})
			)
		})

		it('reuses transporter on subsequent calls', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test',
				html: '<p>Test</p>'
			}

			await provider.send(options)
			await provider.send(options)

			expect(nodemailer.createTransport).toHaveBeenCalledTimes(1)
		})

		it('handles send errors gracefully by logging them', async () => {
			mockTransporter.sendMail.mockRejectedValue(new Error('SMTP error'))

			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test',
				html: '<p>Test</p>'
			}

			await provider.send(options)

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					err: expect.any(Error),
					provider: 'nodemailer'
				}),
				'Email provider error'
			)
		})

		it('validates recipient email addresses', async () => {
			const options: EmailSendOptions = {
				to: 'invalid-email',
				subject: 'Test',
				html: '<p>Test</p>'
			}

			await provider.send(options)

			expect(mockTransporter.sendMail).not.toHaveBeenCalled()
			expect(logger.error).toHaveBeenCalled()
		})
	})

	describe('verify', () => {
		it('verifies SMTP connection successfully', async () => {
			await provider.verify()

			expect(mockTransporter.verify).toHaveBeenCalled()
			expect(logger.info).toHaveBeenCalledWith(
				{
					provider: 'nodemailer',
					host: config.host
				},
				'Nodemailer provider verified'
			)
		})

		it('throws EmailProviderError when verification fails', async () => {
			mockTransporter.verify.mockRejectedValue(new Error('Connection failed'))

			await expect(provider.verify()).rejects.toThrow(EmailProviderError)
			await expect(provider.verify()).rejects.toThrow(
				'Failed to verify SMTP configuration'
			)
		})

		it('throws EmailProviderError with undefined originalError when error is not Error instance', async () => {
			mockTransporter.verify.mockRejectedValue('String error')

			try {
				await provider.verify()
				fail('Should have thrown EmailProviderError')
			} catch (error) {
				expect(error).toBeInstanceOf(EmailProviderError)
				if (error instanceof EmailProviderError) {
					expect(error.originalError).toBeUndefined()
					expect(error.message).toBe('Failed to verify SMTP configuration')
					expect(error.provider).toBe('nodemailer')
				}
			}
		})
	})
})
