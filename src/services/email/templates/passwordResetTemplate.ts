/**
 * Password reset email template
 */
import { EmailTemplate } from '@/types/services'

export const passwordResetEmailTemplate: EmailTemplate = {
	id: 'password-reset-email',
	name: 'Password Reset Email',
	subject: 'Reset your password for {{appName}}',
	html: `
		<h1>Password Reset Requested</h1>
		<p>Hello {{firstName}},</p>
		<p>We received a request to reset your password for {{appName}}.</p>
		<p>You can reset it by clicking the link below:</p>
		<p><a href="{{resetLink}}">Reset your password</a></p>
		<p>This link will expire in {{expiresIn}}.</p>
		<p>If you did not request a password reset, you can ignore this email.</p>
	`,
	text:
		`Hello {{firstName}},\n` +
		`We received a password reset request for {{appName}}.\n` +
		`Reset your password: {{resetLink}}\n` +
		`This link expires in {{expiresIn}}.\n` +
		`If you did not request a password reset, you can ignore this email.`,
	requiredVariables: ['firstName', 'appName', 'resetLink', 'expiresIn'],
	category: 'authentication',
	description: 'Sent when a user requests a password reset'
}
