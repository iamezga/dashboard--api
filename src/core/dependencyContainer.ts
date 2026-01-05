import {
	getRepositoryManager,
	RepositoryManager,
	setDependencyContainerForRepositoryManager
} from '@/core/repositoryManager'
import { databaseManager } from '@/infrastructure/databaseManager'
import { AuditService } from '@/services/auditService'
import { config } from '@/services/config'
import { dayjs } from '@/services/dayjs'
import { EmailService } from '@/services/email/EmailService'
import { InMemoryEmailTemplateRegistry } from '@/services/email/EmailTemplateRegistry'
import { LogEmailProvider } from '@/services/email/providers/LogEmailProvider'
import {
	NodemailerConfig,
	NodemailerProvider
} from '@/services/email/providers/NodemailerProvider'
import { defaultEmailTemplates } from '@/services/email/templates'
import { JobService } from '@/services/jobService'
import logger from '@/services/logger'
import { validator } from '@/services/validationService'
import { DependencyContainer } from '@/types/core/dependencyContainer'
import { utils } from '@/utils'
import * as argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import ms from 'ms'
import { queueManager } from '../infrastructure/queueManager'

let dependencyContainer: DependencyContainer | null = null
let repositoryManager: RepositoryManager | null = null

/**
 * @function getContainer
 * @description Retrieves the singleton instance of the dependency container.
 *
 * Initialization Flow:
 * 1. Build base container with services that don't depend on repositories
 * 2. Register container with repository manager (allows repos to access dependencies)
 * 3. Retrieve repository manager (now fully initialized with container)
 * 4. Build services that depend on repositories
 * 5. Finalize container with all dependencies
 *
 * Architecture:
 * - Repositories receive DependencyContainer in constructor (constructor injection)
 * - No circular dependency issues (container registered before repos access it)
 * - All repositories 100% ready after instantiation
 * - No setContext pattern required
 *
 * @returns {DependencyContainer} The singleton dependency container instance.
 */
export const getContainer = (): DependencyContainer => {
	if (dependencyContainer) return dependencyContainer

	// Step 1: Create a temporary container with base dependencies
	// This allows repositories to access config and logger during construction
	const baseContainer: Partial<DependencyContainer> = {
		config,
		validator,
		logger,
		databaseManager: databaseManager,
		utils,
		libs: { argon2, jwt, ms, dayjs }
	}

	// Step 2: Register the base container with repository manager
	// This allows repositories to extract dependencies they need from the container
	setDependencyContainerForRepositoryManager(
		baseContainer as DependencyContainer
	)

	// Step 3: Retrieve the now-initialized repository manager
	repositoryManager = getRepositoryManager()

	// Step 4: Build services that depend on repositories
	const auditServiceInstance = new AuditService(repositoryManager.get('audit'))
	const emailService = buildEmailService()

	const services = {
		dayjs,
		auditService: auditServiceInstance,
		jobService: new JobService(queueManager),
		emailService
	}

	// Step 5: Finalize the container with all dependencies
	dependencyContainer = {
		config,
		validator,
		logger,
		databaseManager: databaseManager,
		repositoryManager,
		utils,
		services,
		libs: { argon2, jwt, ms, dayjs }
	}

	return dependencyContainer
}

const buildEmailService = (): EmailService => {
	const emailConfig = config.get('email')
	const baseLogger = logger.child({ service: 'email' })

	const provider =
		emailConfig.provider === 'nodemailer'
			? new NodemailerProvider(
					{
						host: emailConfig.nodemailer.host,
						port: emailConfig.nodemailer.port,
						secure: emailConfig.nodemailer.secure,
						auth: {
							user: emailConfig.nodemailer.auth.user,
							pass: emailConfig.nodemailer.auth.pass
						},
						from: emailConfig.nodemailer.from
					} as NodemailerConfig,
					baseLogger.child({ provider: 'nodemailer' })
			  )
			: new LogEmailProvider(baseLogger.child({ provider: 'log' }))

	const registry = new InMemoryEmailTemplateRegistry()
	defaultEmailTemplates.forEach(template => registry.register(template))

	return new EmailService(provider, baseLogger, registry)
}

/**
 * @function getCustomContainer
 * @description Provides a way to get a subset of the container's dependencies via a callback.
 * This is useful for tests or specific scenarios where only a part of the container is needed.
 * @template T
 * @param {(container: DependencyContainer) => T} cb - A callback function that receives the full container and returns a custom object.
 * @returns {T} The object returned by the callback.
 */
export function getCustomContainer<T extends Partial<DependencyContainer>>(
	cb: (container: DependencyContainer) => T
): T {
	return cb(getContainer())
}

/**
 * Test helper: reset the singleton container so tests can start fresh.
 */
export const resetContainer = (): void => {
	dependencyContainer = null
}
