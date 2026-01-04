/**
 * Password reset email template
 */
import { EmailTemplate } from '@/types/services'

export const passwordResetEmailTemplate: EmailTemplate = {
	id: 'password-reset-email',
	name: 'Password Reset Email',
	subject: 'Password Recovery Request - {{appName}}',
	html: `
		<h1>Password Recovery</h1>
		<p>Hello {{name}},</p>
		<p>You requested to reset your password for {{appName}}. Click the link below to proceed:</p>
		<p><a href="{{resetLink}}">Reset Password</a></p>
		<p>This link will expire in {{expiresIn}}.</p>
		<p>If you didn't request this, please ignore this email.</p>
	`,
	text:
		`Password Recovery\n\n` +
		`Hello {{name}},\n\n` +
		`You requested to reset your password for {{appName}}. Use the link below to proceed:\n` +
		`{{resetLink}}\n\n` +
		`This link will expire in {{expiresIn}}.\n\n` +
		`If you didn't request this, please ignore this email.`,
	requiredVariables: ['name', 'appName', 'resetLink', 'expiresIn'],
	category: 'authentication',
	description: 'Sent when a user requests a password reset'
}
