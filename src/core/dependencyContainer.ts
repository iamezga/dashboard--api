import {
	getRepositoryManager,
	RepositoryManager
} from '@/core/repositoryManager'
import { databaseManager } from '@/infrastructure/databaseManager'
import { AuditService } from '@/services/auditService'
import { config } from '@/services/config'
import { dayjs } from '@/services/dayjs'
import { JobService } from '@/services/jobService'
import { LogEmailService } from '@/services/LogEmailService'
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
 * If the container does not exist, it creates and initializes it, including the repository manager and all services.
 * @returns {DependencyContainer} The singleton dependency container instance.
 */
export const getContainer = (): DependencyContainer => {
	if (dependencyContainer) return dependencyContainer

	repositoryManager = getRepositoryManager()

	// Resolve the audit repository implementation
	const auditServiceInstance = new AuditService(repositoryManager.get('audit'))

	const services = {
		dayjs,
		auditService: auditServiceInstance,
		jobService: new JobService(queueManager),
		emailService: new LogEmailService()
	}

	if (config.get('env') === 'production') {
		// services.emailService = new [Some]EmailService() // TODO: Implement [Some]EmailService for production
	} else {
		services.emailService = new LogEmailService()
	}

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

	repositoryManager.setContext(dependencyContainer)
	services.emailService.setContext(dependencyContainer)

	return dependencyContainer
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
