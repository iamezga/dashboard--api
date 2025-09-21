import {
	getRepositoryManager,
	RepositoryManager
} from '@/core/repositoryManager'
import {
	ProviderManager,
	providerManager
} from '@/infrastructure/providerManager'
import { AuditService } from '@/services/auditService'
import { config, Config } from '@/services/config'
import { dayjs, Dayjs } from '@/services/dayjs'
import logger from '@/services/logger'
import { ValidationService, validator } from '@/services/validationService'
import { UtilityMap, utils } from '@/utils'
import * as argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import ms from 'ms'
import { Logger } from 'pino'

export interface DependencyContainer {
	config: Config
	validator: ValidationService
	logger: Logger
	providerManager: ProviderManager
	repositoryManager: RepositoryManager
	services: {
		auditService: AuditService
	}
	libs: {
		dayjs: Dayjs
		argon2: typeof argon2
		jwt: typeof jwt
		ms: typeof ms
	}
	utils: UtilityMap
}

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

	const services = {
		dayjs,
		auditService: new AuditService(repositoryManager.get('audit'))
	}

	dependencyContainer = {
		config,
		validator,
		logger,
		providerManager,
		repositoryManager,
		utils,
		services,
		libs: { argon2, jwt, ms, dayjs }
	}

	repositoryManager.setContext(dependencyContainer)

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
