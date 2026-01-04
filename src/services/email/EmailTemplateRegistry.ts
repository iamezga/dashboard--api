/**
 * In-memory implementation of EmailTemplateRegistry.
 * Responsible for storing, validating, and rendering templates.
 */
import {
	EmailTemplate,
	EmailTemplateRegistry,
	RenderedEmailTemplate
} from '@/types/services'

export class InMemoryEmailTemplateRegistry implements EmailTemplateRegistry {
	private readonly templates = new Map<string, EmailTemplate>()

	get(id: string): EmailTemplate {
		const tmpl = this.templates.get(id)
		if (!tmpl) throw new Error(`Email template not found: ${id}`)
		return tmpl
	}

	register(template: EmailTemplate): void {
		this.templates.set(template.id, template)
	}

	has(id: string): boolean {
		return this.templates.has(id)
	}

	getAll(): EmailTemplate[] {
		return Array.from(this.templates.values())
	}

	getByCategory(category: string): EmailTemplate[] {
		return this.getAll().filter(t => t.category === category)
	}

	validateData(templateId: string, data: Record<string, any>): void {
		const tmpl = this.get(templateId)
		const required = tmpl.requiredVariables || []
		const missing = required.filter(
			v => data[v] === undefined || data[v] === null
		)
		if (missing.length) {
			throw new Error(
				`Missing required variables for template '${templateId}': ${missing.join(
					', '
				)}`
			)
		}
	}

	render(templateId: string, data: Record<string, any>): RenderedEmailTemplate {
		const tmpl = this.get(templateId)
		this.validateData(templateId, data)

		const subject = this.renderString(tmpl.subject, data)
		const html = this.renderString(tmpl.html, data)
		const textBase = tmpl.text ? tmpl.text : this.stripHtml(tmpl.html)
		const text = this.renderString(textBase, data)

		return {
			subject,
			html,
			text,
			templateId,
			renderedAt: new Date()
		}
	}

	private renderString(template: string, data: Record<string, any>): string {
		// Simple mustache-like replacement {{var}}
		return template.replace(/{{\s*([\w.]+)\s*}}/g, (_match, key) => {
			const value = this.resolvePath(data, key)
			return value === undefined || value === null ? '' : String(value)
		})
	}

	private resolvePath(obj: Record<string, any>, path: string): any {
		return path
			.split('.')
			.reduce((acc, part) => (acc ? acc[part] : undefined), obj)
	}

	private stripHtml(html: string): string {
		return html
			.replace(/<[^>]*>/g, ' ')
			.replace(/\s+/g, ' ')
			.trim()
	}
}
