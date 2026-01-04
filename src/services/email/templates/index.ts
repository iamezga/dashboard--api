import { EmailTemplate } from '@/types/services'
import { passwordResetEmailTemplate } from './passwordResetTemplate'
import { userWelcomeEmailTemplate } from './userWelcomeTemplate'
import { welcomeEmailTemplate } from './welcomeTemplate'

export const defaultEmailTemplates: EmailTemplate[] = [
	welcomeEmailTemplate,
	userWelcomeEmailTemplate,
	passwordResetEmailTemplate
]

export {
	passwordResetEmailTemplate,
	userWelcomeEmailTemplate,
	welcomeEmailTemplate
}
