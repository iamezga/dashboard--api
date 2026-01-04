import { EmailTemplate } from '@/types/services'
import { passwordResetConfirmationEmailTemplate } from './passwordResetConfirmationTemplate'
import { passwordResetEmailTemplate } from './passwordResetTemplate'
import { userWelcomeEmailTemplate } from './userWelcomeTemplate'
import { welcomeEmailTemplate } from './welcomeTemplate'

export const defaultEmailTemplates: EmailTemplate[] = [
	welcomeEmailTemplate,
	userWelcomeEmailTemplate,
	passwordResetEmailTemplate,
	passwordResetConfirmationEmailTemplate
]

export {
	passwordResetConfirmationEmailTemplate,
	passwordResetEmailTemplate,
	userWelcomeEmailTemplate,
	welcomeEmailTemplate
}
