import { Logger } from 'pino'
import { vi } from 'vitest'
import { EmailSendOptions } from '../../../types/services'
import { LogEmailProvider } from './LogEmailProvider'

const createLogger = (): Logger => {
	const logger: any = {
		info: vi.fn(),
		error: vi.fn(),
		warn: vi.fn(),
		child: vi.fn()
	}
	logger.child.mockReturnValue(logger)
	return logger as Logger
}

describe('LogEmailProvider', () => {
	let provider: LogEmailProvider
	let logger: Logger

	beforeEach(() => {
		logger = createLogger()
		provider = new LogEmailProvider(logger)
	})

	it('has correct provider name', () => {
		expect(provider.name).toBe('log')
	})

	describe('send', () => {
		it('logs email details with all fields', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test Email',
				html: '<p>Hello</p>',
				text: 'Hello',
				from: 'noreply@test.com',
				replyTo: 'support@test.com',
				cc: 'manager@test.com',
				bcc: ['audit@test.com'],
				templateId: 'welcome',
				templateData: { name: 'John' },
				metadata: { userId: '123' }
			}

			await provider.send(options)

			expect(logger.info).toHaveBeenCalledWith(
				expect.objectContaining({
					provider: 'log',
					to: ['user@test.com'],
					subject: 'Test Email',
					templateId: 'welcome',
					templateData: { name: 'John' },
					from: 'noreply@test.com',
					replyTo: 'support@test.com',
					cc: ['manager@test.com'],
					bcc: ['audit@test.com'],
					metadata: { userId: '123' },
					html: '<p>Hello</p>',
					text: 'Hello'
				}),
				'[EMAIL LOG] Email captured by LogEmailProvider'
			)
		})

		it('normalizes recipients to arrays', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test',
				html: '<p>Test</p>'
			}

			await provider.send(options)

			expect(logger.info).toHaveBeenCalledWith(
				expect.objectContaining({
					to: ['user@test.com'],
					cc: [],
					bcc: []
				}),
				expect.any(String)
			)
		})

		it('generates text fallback from html if not provided', async () => {
			const options: EmailSendOptions = {
				to: 'user@test.com',
				subject: 'Test',
				html: '<p>Hello <b>World</b></p>'
			}

			await provider.send(options)

			expect(logger.info).toHaveBeenCalledWith(
				expect.objectContaining({
					text: 'Hello World'
				}),
				expect.any(String)
			)
		})

		it('handles send errors gracefully by logging them', async () => {
			const options: EmailSendOptions = {
				to: 'invalid-email',
				subject: 'Test',
				html: '<p>Test</p>'
			}

			await provider.send(options)

			expect(logger.error).toHaveBeenCalled()
		})
	})

	describe('verify', () => {
		it('logs ready message without errors', async () => {
			await provider.verify()

			expect(logger.info).toHaveBeenCalledWith(
				{ provider: 'log' },
				'LogEmailProvider ready'
			)
		})
	})
})
