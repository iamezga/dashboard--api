import { DependencyContainer } from '@/types/core/dependencyContainer'

export type EmailOptions = {
	to: string | string[]
	subject: string
	templateId: string // e.g., 'user-welcome', 'password-reset'
	data: Record<string, any> // Data to be injected into the template
}

/**
 * @interface EmailServiceInterface
 * @description Defines the contract for an email sending service.
 * This abstraction allows for different providers (e.g., SendGrid, Nodemailer, or a simple logger)
 * to be used interchangeably.
 */
export interface EmailServiceInterface {
	setContext(container: DependencyContainer): void
	send(options: EmailOptions): Promise<void>
}
