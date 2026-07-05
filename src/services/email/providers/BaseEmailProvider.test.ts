import { Logger } from 'pino'
import { vi } from 'vitest'
import { EmailProviderError } from '../../../errors'
import { EmailSendOptions } from '../../../types/services'
import { BaseEmailProvider } from './BaseEmailProvider'

// Concrete implementation for testing
class TestEmailProvider extends BaseEmailProvider {
	readonly name = 'test'
	sendCalled = false
	verifyCalled = false

	constructor(logger: Logger) {
		super(logger)
	}

	async send(_options: EmailSendOptions): Promise<void> {
		this.sendCalled = true
	}

	async verify(): Promise<void> {
		this.verifyCalled = true
	}
}

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

describe('BaseEmailProvider', () => {
	let provider: TestEmailProvider
	let logger: Logger

	beforeEach(() => {
		logger = createLogger()
		provider = new TestEmailProvider(logger)
	})

	describe('normalizeRecipients', () => {
		it('normalizes single email string to array', () => {
			const result = (provider as any).normalizeRecipients('user@test.com')
			expect(result).toEqual(['user@test.com'])
		})

		it('normalizes array of emails', () => {
			const result = (provider as any).normalizeRecipients([
				'user1@test.com',
				'user2@test.com'
			])
			expect(result).toEqual(['user1@test.com', 'user2@test.com'])
		})

		it('trims whitespace from emails', () => {
			const result = (provider as any).normalizeRecipients([
				'  user1@test.com  ',
				'user2@test.com'
			])
			expect(result).toEqual(['user1@test.com', 'user2@test.com'])
		})

		it('filters out empty strings', () => {
			const result = (provider as any).normalizeRecipients([
				'user@test.com',
				'',
				'   '
			])
			expect(result).toEqual(['user@test.com'])
		})
	})

	describe('ensureRecipients', () => {
		it('validates and returns valid email addresses', () => {
			const result = (provider as any).ensureRecipients([
				'user@test.com',
				'admin@test.com'
			])
			expect(result).toEqual(['user@test.com', 'admin@test.com'])
		})

		it('throws EmailProviderError when no recipients provided', () => {
			expect(() => (provider as any).ensureRecipients([])).toThrow(
				EmailProviderError
			)
			expect(() => (provider as any).ensureRecipients('')).toThrow(
				'No recipients provided'
			)
		})

		it('throws EmailProviderError for invalid email format', () => {
			expect(() =>
				(provider as any).ensureRecipients(['invalid-email'])
			).toThrow(EmailProviderError)
			expect(() =>
				(provider as any).ensureRecipients(['user@test.com', 'bad@'])
			).toThrow(/Invalid recipient emails/)
		})
	})

	describe('isValidEmail', () => {
		it('validates correct email formats', () => {
			expect((provider as any).isValidEmail('user@example.com')).toBe(true)
			expect(
				(provider as any).isValidEmail('test.user+tag@sub.domain.com')
			).toBe(true)
		})

		it('rejects invalid email formats', () => {
			expect((provider as any).isValidEmail('invalid')).toBe(false)
			expect((provider as any).isValidEmail('user@')).toBe(false)
			expect((provider as any).isValidEmail('@domain.com')).toBe(false)
			expect((provider as any).isValidEmail('user @example.com')).toBe(false)
		})
	})

	describe('ensureText', () => {
		it('returns provided text when available', () => {
			const result = (provider as any).ensureText('<p>Hello</p>', 'Hello plain')
			expect(result).toBe('Hello plain')
		})

		it('strips HTML tags when text not provided', () => {
			const result = (provider as any).ensureText('<p>Hello <b>world</b></p>')
			expect(result).toBe('Hello world')
		})

		it('returns undefined when neither html nor text provided', () => {
			const result = (provider as any).ensureText()
			expect(result).toBeUndefined()
		})

		it('collapses multiple spaces', () => {
			const result = (provider as any).ensureText(
				'<p>Hello    <br>   world</p>'
			)
			expect(result).toBe('Hello world')
		})
	})

	describe('handleError', () => {
		it('logs error with provider name and context', () => {
			const error = new Error('Send failed')
			const context = { to: 'user@test.com', subject: 'Test' }

			;(provider as any).handleError(error, context)

			expect(logger.error).toHaveBeenCalledWith(
				{
					err: error,
					provider: 'test',
					context
				},
				'Email provider error'
			)
		})

		it('handles non-Error objects', () => {
			;(provider as any).handleError('string error')

			expect(logger.error).toHaveBeenCalledWith(
				expect.objectContaining({
					err: expect.any(Error),
					provider: 'test'
				}),
				'Email provider error'
			)
		})
	})
})
