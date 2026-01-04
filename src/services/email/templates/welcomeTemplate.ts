/**
 * Welcome email template
 */
import { EmailTemplate } from '@/types/services'

export const welcomeEmailTemplate: EmailTemplate = {
	id: 'welcome-email',
	name: 'Welcome Email',
	subject: 'Welcome to {{appName}}, {{firstName}}!',
	html: `
		<h1>Welcome, {{firstName}}!</h1>
		<p>We are excited to have you on board at {{appName}}.</p>
		<p>To get started, please confirm your email:</p>
		<p><a href="{{confirmLink}}">Confirm your email</a></p>
		<p>If the link doesn't work, copy and paste this URL into your browser:</p>
		<p>{{confirmLink}}</p>
	`,
	text:
		`Welcome, {{firstName}}!\n` +
		`We are excited to have you on board at {{appName}}.\n` +
		`Confirm your email: {{confirmLink}}`,
	requiredVariables: ['firstName', 'appName', 'confirmLink'],
	optionalVariables: ['supportEmail'],
	category: 'onboarding',
	description: 'Sent when a user signs up to welcome and confirm email address'
}
