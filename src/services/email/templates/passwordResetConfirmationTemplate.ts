/**
 * Password reset confirmation email template
 */
import { EmailTemplate } from '@/types/services'

export const passwordResetConfirmationEmailTemplate: EmailTemplate = {
	id: 'password-reset-confirmation',
	name: 'Password Reset Confirmation',
	subject: 'Your password has been changed - {{appName}}',
	html: `
		<h1>Password Changed Successfully</h1>
		<p>Hello {{name}},</p>
		<p>Your password for {{appName}} has been successfully changed.</p>
		<p>If you made this change, you can safely ignore this email.</p>
		<p>If you did not make this change, please contact our support team immediately at {{supportEmail}}.</p>
		<p>For your security, all active sessions have been logged out and you will need to sign in again with your new password.</p>
	`,
	text:
		`Password Changed Successfully\n\n` +
		`Hello {{name}},\n\n` +
		`Your password for {{appName}} has been successfully changed.\n\n` +
		`If you made this change, you can safely ignore this email.\n\n` +
		`If you did not make this change, please contact our support team immediately at {{supportEmail}}.\n\n` +
		`For your security, all active sessions have been logged out and you will need to sign in again with your new password.`,
	requiredVariables: ['name', 'appName', 'supportEmail'],
	category: 'authentication',
	description: 'Sent after a user successfully resets their password'
}
