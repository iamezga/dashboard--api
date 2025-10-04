import { DependencyContainer } from '@/types/core/dependencyContainer'
import {
	EmailOptions,
	EmailServiceInterface
} from '@/types/services/EmailServiceInterface'
import { Logger } from 'pino'

export type LogEmailServiceContext = {
	logger: Logger
}

/**
 * @class LogEmailService
 * @description A development-focused implementation of the EmailService that logs emails to the console
 * instead of sending them. This is useful for local development and testing.
 */
export class LogEmailService implements EmailServiceInterface {
	static serviceName = 'emailService' as const
	private context!: LogEmailServiceContext

	setContext(container: DependencyContainer): void {
		const { logger } = container
		this.context = { logger }
	}

	async send(options: EmailOptions): Promise<void> {
		this.context.logger.info(
			{
				...options,
				service: 'LogEmailService'
			},
			`[EMAIL LOG] Email sent to ${options.to}`
		)
	}
}
