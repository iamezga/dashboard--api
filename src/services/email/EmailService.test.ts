import { Logger } from 'pino'
import { EmailProvider, EmailTemplate } from '../../types/services'
import { EmailService } from './EmailService'
import { InMemoryEmailTemplateRegistry } from './EmailTemplateRegistry'

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

describe('EmailService', () => {
	let registry: InMemoryEmailTemplateRegistry
	let logger: Logger
	let template: EmailTemplate

	beforeEach(() => {
		registry = new InMemoryEmailTemplateRegistry()
		logger = createLogger()
		template = {
			id: 'welcome',
			name: 'Welcome Email',
			subject: 'Hello {{firstName}}',
			html: '<p>Hi {{firstName}}</p>',
			text: 'Hi {{firstName}}',
			requiredVariables: ['firstName'],
			defaultFrom: 'noreply@test.com',
			defaultReplyTo: 'support@test.com'
		}
		registry.register(template)
	})

	it('creates its own registry when templates parameter not provided', () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn(),
			verify: jest.fn()
		}

		// Create service without passing templates (uses default parameter)
		const service = new EmailService(provider, logger)

		const registry = service.getTemplateRegistry()
		expect(registry).toBeDefined()
		expect(registry).toBeInstanceOf(InMemoryEmailTemplateRegistry)
	})

	it('renders templates and delegates to provider', async () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn().mockResolvedValue(undefined),
			verify: jest.fn().mockResolvedValue(undefined)
		}

		const service = new EmailService(provider, logger, registry)

		await service.send({
			to: 'user@test.com',
			templateId: 'welcome',
			templateData: { firstName: 'Alex' },
			cc: 'cc@test.com',
			bcc: ['hidden@test.com'],
			metadata: { source: 'signup' }
		})

		expect(provider.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@test.com',
				subject: 'Hello Alex',
				html: '<p>Hi Alex</p>',
				text: 'Hi Alex',
				templateId: 'welcome',
				templateData: { firstName: 'Alex' },
				from: 'noreply@test.com',
				replyTo: 'support@test.com',
				cc: 'cc@test.com',
				bcc: ['hidden@test.com'],
				metadata: { source: 'signup' }
			})
		)
	})

	it('handles missing templateData by using empty object', async () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn().mockResolvedValue(undefined),
			verify: jest.fn().mockResolvedValue(undefined)
		}

		// Template without required variables
		const simpleTemplate: EmailTemplate = {
			id: 'simple',
			name: 'Simple Email',
			subject: 'Static Subject',
			html: '<p>Static content</p>',
			text: 'Static content'
			// No requiredVariables
		}
		registry.register(simpleTemplate)

		const service = new EmailService(provider, logger, registry)

		// Send without templateData
		await service.send({
			to: 'user@test.com',
			templateId: 'simple'
			// templateData is undefined
		})

		expect(provider.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@test.com',
				subject: 'Static Subject',
				html: '<p>Static content</p>',
				text: 'Static content',
				templateId: 'simple',
				templateData: undefined
			})
		)
	})

	it('logs errors when template validation fails without calling provider', async () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn().mockResolvedValue(undefined),
			verify: jest.fn().mockResolvedValue(undefined)
		}
		const service = new EmailService(provider, logger, registry)

		await service.send({
			to: 'user@test.com',
			templateId: 'welcome',
			templateData: { firstName: undefined as any }
		})

		expect(provider.send).not.toHaveBeenCalled()
		expect(logger.error).toHaveBeenCalled()
	})

	it('logs provider errors and continues for send', async () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn().mockRejectedValue(new Error('provider failed')),
			verify: jest.fn().mockResolvedValue(undefined)
		}
		const service = new EmailService(provider, logger, registry)

		await service.send({
			to: 'user@test.com',
			templateId: 'welcome',
			templateData: { firstName: 'Casey' }
		})

		expect(logger.error).toHaveBeenCalled()
	})

	it('proxies sendHtml directly to provider', async () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn().mockResolvedValue(undefined),
			verify: jest.fn().mockResolvedValue(undefined)
		}
		const service = new EmailService(provider, logger, registry)

		await service.sendHtml({
			to: 'user@test.com',
			subject: 'Direct send',
			html: '<p>Hello</p>'
		})

		expect(provider.send).toHaveBeenCalledWith(
			expect.objectContaining({
				to: 'user@test.com',
				subject: 'Direct send',
				html: '<p>Hello</p>'
			})
		)
	})

	it('logs provider errors for sendHtml', async () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn().mockRejectedValue(new Error('provider failed')),
			verify: jest.fn().mockResolvedValue(undefined)
		}
		const service = new EmailService(provider, logger, registry)

		await service.sendHtml({
			to: 'user@test.com',
			subject: 'Direct send',
			html: '<p>Hello</p>'
		})

		expect(logger.error).toHaveBeenCalled()
	})

	it('registers new templates via registerTemplate', () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn(),
			verify: jest.fn()
		}
		const service = new EmailService(provider, logger, registry)

		const newTemplate: EmailTemplate = {
			id: 'password-reset',
			name: 'Password Reset',
			subject: 'Reset your password',
			html: '<p>Reset link</p>',
			requiredVariables: []
		}

		service.registerTemplate(newTemplate)

		const retrievedRegistry = service.getTemplateRegistry()
		expect(retrievedRegistry.has('password-reset')).toBe(true)
		expect(retrievedRegistry.get('password-reset')).toEqual(newTemplate)
	})

	it('returns template registry via getTemplateRegistry', () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn(),
			verify: jest.fn()
		}
		const service = new EmailService(provider, logger, registry)

		const retrievedRegistry = service.getTemplateRegistry()

		expect(retrievedRegistry).toBe(registry)
		expect(retrievedRegistry.has('welcome')).toBe(true)
	})

	it('returns provider via getProvider', () => {
		const provider: EmailProvider = {
			name: 'mock',
			send: jest.fn(),
			verify: jest.fn()
		}
		const service = new EmailService(provider, logger, registry)

		const retrievedProvider = service.getProvider()

		expect(retrievedProvider).toBe(provider)
		expect(retrievedProvider.name).toBe('mock')
	})
})
