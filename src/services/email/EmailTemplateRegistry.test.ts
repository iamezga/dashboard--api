import { EmailTemplate } from '../../types/services'
import { InMemoryEmailTemplateRegistry } from './EmailTemplateRegistry'

describe('InMemoryEmailTemplateRegistry', () => {
	let registry: InMemoryEmailTemplateRegistry
	let baseTemplate: EmailTemplate

	beforeEach(() => {
		registry = new InMemoryEmailTemplateRegistry()
		baseTemplate = {
			id: 'password-reset',
			name: 'Password Reset',
			subject: 'Reset your password, {{firstName}}',
			html: '<p>Hello {{firstName}}</p><p>Reset: {{resetLink}}</p>',
			text: 'Hello {{firstName}}. Reset: {{resetLink}}',
			requiredVariables: ['firstName', 'resetLink'],
			category: 'authentication'
		}

		registry.register(baseTemplate)
	})

	it('registers, retrieves, and lists templates', () => {
		expect(registry.has(baseTemplate.id)).toBe(true)
		expect(registry.get(baseTemplate.id)).toEqual(baseTemplate)
		expect(registry.getAll()).toHaveLength(1)
		expect(registry.getByCategory('authentication')).toHaveLength(1)
	})

	it('throws when required variables are missing', () => {
		expect(() =>
			registry.validateData(baseTemplate.id, { firstName: 'Jane' })
		).toThrow(/Missing required variables/)
	})

	it('validates successfully when template has no required variables', () => {
		const noRequiredTemplate: EmailTemplate = {
			id: 'no-required',
			name: 'No Required Variables',
			subject: 'Static subject',
			html: '<p>Static content</p>'
			// requiredVariables is undefined
		}
		registry.register(noRequiredTemplate)

		// Should not throw even with empty data
		expect(() => registry.validateData('no-required', {})).not.toThrow()
		expect(() =>
			registry.validateData('no-required', { extra: 'data' })
		).not.toThrow()
	})

	it('renders templates with interpolation and text fallback', () => {
		const template: EmailTemplate = {
			...baseTemplate,
			id: 'no-text',
			text: undefined,
			html: '<h1>Hello {{firstName}}</h1><p>Link: {{resetLink}}</p>'
		}
		registry.register(template)

		const rendered = registry.render('no-text', {
			firstName: 'Alex',
			resetLink: 'https://example.com/reset'
		})

		expect(rendered.subject).toBe('Reset your password, Alex')
		expect(rendered.html).toContain('Alex')
		expect(rendered.text).toContain('Hello Alex')
		expect(rendered.renderedAt).toBeInstanceOf(Date)
	})

	it('renders templates with nested data paths', () => {
		const nestedTemplate: EmailTemplate = {
			id: 'nested',
			name: 'Nested Template',
			subject: 'Hello {{user.first}}',
			html: '<p>Contact: {{user.contact.email}}</p>',
			requiredVariables: ['user']
		}
		registry.register(nestedTemplate)

		const rendered = registry.render('nested', {
			user: {
				first: 'Rae',
				contact: { email: 'rae@example.com' }
			}
		})

		expect(rendered.subject).toBe('Hello Rae')
		expect(rendered.html).toBe('<p>Contact: rae@example.com</p>')
		expect(rendered.text).toBe('Contact: rae@example.com')
	})

	it('throws error when template not found', () => {
		expect(() => registry.get('non-existent')).toThrow(
			'Email template not found: non-existent'
		)
	})

	it('returns empty array when no templates match category', () => {
		const result = registry.getByCategory('non-existent-category')
		expect(result).toEqual([])
	})

	it('handles undefined/null values in template data gracefully', () => {
		const template: EmailTemplate = {
			id: 'test-nulls',
			name: 'Test Nulls',
			subject: 'Hello {{name}} {{missing}}',
			html: '<p>{{value}}</p>',
			requiredVariables: []
		}
		registry.register(template)

		const rendered = registry.render('test-nulls', {
			name: 'John',
			value: null
		})

		expect(rendered.subject).toBe('Hello John ')
		expect(rendered.html).toBe('<p></p>')
	})

	it('handles nested path with missing intermediate properties', () => {
		const template: EmailTemplate = {
			id: 'missing-path',
			name: 'Missing Path',
			subject: 'Value: {{user.profile.name}}',
			html: '<p>{{user.missing.prop}}</p>',
			requiredVariables: []
		}
		registry.register(template)

		const rendered = registry.render('missing-path', {
			user: {
				profile: { name: 'Alice' }
			}
		})

		expect(rendered.subject).toBe('Value: Alice')
		expect(rendered.html).toBe('<p></p>')
	})

	it('validates data before rendering', () => {
		expect(() =>
			registry.render('password-reset', { firstName: 'Test' })
		).toThrow(/Missing required variables/)
	})

	it('strips HTML correctly with multiple tags and whitespace', () => {
		const template: EmailTemplate = {
			id: 'complex-html',
			name: 'Complex HTML',
			subject: 'Test',
			html: '<div>  <p>Hello</p>  <br />  <span>World</span>  </div>',
			requiredVariables: []
		}
		registry.register(template)

		const rendered = registry.render('complex-html', {})

		expect(rendered.text).toBe('Hello World')
	})
})
