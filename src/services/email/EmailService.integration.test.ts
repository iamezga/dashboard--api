/**
 * Manual integration test for email service.
 * This test is skipped by default and should be run manually when needed.
 *
 * To run this test:
 * 1. Configure SMTP settings in .env file:
 *    EMAIL_PROVIDER=nodemailer
 *    SMTP_HOST=smtp.gmail.com
 *    SMTP_PORT=587
 *    SMTP_SECURE=false
 *    SMTP_USER=your-email@gmail.com
 *    SMTP_PASS=your-app-password
 *    SMTP_FROM=noreply@yourdomain.com
 *    TEST_EMAIL=your-test-email@example.com
 *
 * 2. Remove the .skip from describe.skip below
 *
 * 3. Run: npm test -- EmailService.integration.test
 *
 * Note: Jest loads .env automatically via setupTests.ts
 */

import { config } from '../../services/config'
import logger from '../../services/logger'
import { EmailService } from './EmailService'
import { InMemoryEmailTemplateRegistry } from './EmailTemplateRegistry'
import { LogEmailProvider } from './providers/LogEmailProvider'
import {
	NodemailerConfig,
	NodemailerProvider
} from './providers/NodemailerProvider'
import { defaultEmailTemplates } from './templates'

describe.skip('EmailService Integration Tests (Manual)', () => {
	let emailService: EmailService

	beforeAll(() => {
		const emailConfig = config.get('email')
		const baseLogger = logger.child({ service: 'email-test' })
		const provider =
			emailConfig.provider === 'nodemailer'
				? new NodemailerProvider(
						{
							host: emailConfig.nodemailer.host,
							port: emailConfig.nodemailer.port,
							secure: emailConfig.nodemailer.secure,
							auth: {
								user: emailConfig.nodemailer.auth.user,
								pass: emailConfig.nodemailer.auth.pass
							},
							from: emailConfig.nodemailer.from
						} as NodemailerConfig,
						baseLogger
				  )
				: new LogEmailProvider(baseLogger)

		const registry = new InMemoryEmailTemplateRegistry()
		defaultEmailTemplates.forEach(template => registry.register(template))

		emailService = new EmailService(provider, baseLogger, registry)
	})

	it('should verify SMTP connection', async () => {
		const provider = emailService.getProvider()
		await expect(provider.verify()).resolves.not.toThrow()
	})

	const testEmail = process.env.TEST_EMAIL
	it('should send a test email using nodemailer', async () => {
		if (!testEmail) {
			throw new Error(
				'TEST_EMAIL environment variable is required. Add it to your .env file.'
			)
		}

		await emailService.send({
			to: testEmail,
			templateId: 'user-welcome',
			templateData: {
				name: 'Integration Test User',
				appName: config.get('appName')
			}
		})

		// Check your inbox for the email
		console.log(`Test email sent to ${testEmail}`)
	})

	if (!testEmail) {
		throw new Error(
			'TEST_EMAIL environment variable is required. Add it to your .env file.'
		)
	}

	it('should send raw HTML email', async () => {
		const testEmail = process.env.TEST_EMAIL || 'your-test-email@example.com'

		await emailService.sendHtml({
			to: testEmail,
			subject: 'Test HTML Email',
			html: '<h1>Integration Test</h1><p>This is a test email from the integration suite.</p>',
			text: 'Integration Test - This is a test email from the integration suite.'
		})

		console.log(`HTML test email sent to ${testEmail}`)
	})

	it('should send email with attachments', async () => {
		const testEmail = process.env.TEST_EMAIL || 'your-test-email@example.com'

		await emailService.sendHtml({
			to: testEmail,
			subject: 'Test Email with Attachment',
			html: '<p>This email has an attachment.</p>',
			attachments: [
				{
					filename: 'test.txt',
					content: Buffer.from('This is a test attachment'),
					contentType: 'text/plain'
				}
			]
		})

		console.log(`Email with attachment sent to ${testEmail}`)
	})
})
