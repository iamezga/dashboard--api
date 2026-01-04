/**
 * User welcome email template
 */
import { EmailTemplate } from '@/types/services'

export const userWelcomeEmailTemplate: EmailTemplate = {
	id: 'user-welcome',
	name: 'User Welcome Email',
	subject: 'Welcome to {{appName}}',
	html: `
		<h1>Welcome, {{name}}!</h1>
		<p>We are excited to have you at {{appName}}.</p>
		<p>If you have any questions, just reply to this email and we'll be happy to help.</p>
	`,
	text:
		`Welcome, {{name}}!\n` +
		`We are excited to have you at {{appName}}.\n` +
		`If you have any questions, just reply to this email.`,
	requiredVariables: ['name', 'appName'],
	category: 'onboarding',
	description: 'Welcome email for newly created users'
}
