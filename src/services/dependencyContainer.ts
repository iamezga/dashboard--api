import { RepositoryMap } from '@/modules/repositories'
import config from '@/services/config'
import {
	ConnectedDatabases,
	databaseServiceManager
} from '@/services/databaseServiceManager'
import { loadRepositories } from '@/services/repositoryLoader'
import { validator } from '@/services/validationService'
import { UtilityMap, utils as utilities } from '@/utils'
import * as argon2 from 'argon2'
import jwt from 'jsonwebtoken'
import ms from 'ms'
import op from 'object-path'
import { Dayjs, dayjs } from './dayjs'
import logger from './logger'

/**
 * @interface DependencyContainerInterface
 * @description Defines the structure of the dependency container after repositories initialization,
 * providing access to services and third-party libraries.
 */
export interface DependencyContainerInterface {
	config: typeof config
	validator: typeof validator
	logger: typeof logger
	repositories: RepositoryMap
	databaseClients: ConnectedDatabases
	thirdParties: {
		argon2: typeof argon2
		jwt: typeof jwt
		ms: typeof ms
		op: typeof op
		dayjs: Dayjs
	}
	utils: UtilityMap
}

/**
 * @class DependencyContainerClass
 * @description The central dependency container for the application.
 * This service allows you to centralize services and third-party libraries needed for
 * different use cases, avoiding multiple injections when instantiating them.
 * So, they can be reduced to a single injection, allowing for clean code with simple use-case constructors.
 */
class DependencyContainerClass implements DependencyContainerInterface {
	public config: typeof config = config
	public validator: typeof validator = validator
	public logger: typeof logger = logger
	public repositories!: RepositoryMap // Will be assigned during repositories initialization
	public databaseClients!: ConnectedDatabases // Will be assigned during repositories initialization
	public utils: UtilityMap = utilities
	public thirdParties = {
		argon2,
		jwt,
		ms,
		op,
		dayjs
	}

	/**
	 * Initializes the repositories within the dependency container.
	 * This method should be called after database connections have been established [databaseServiceManager.initialize()].
	 * @returns {Promise<void>} A promise that resolves when the repositories are loaded.
	 */
	public async initializeRepositories(): Promise<void> {
		this.logger.info('DependencyContainer: Initializing repositories...')
		this.databaseClients = databaseServiceManager.getDatabases()
		this.repositories = loadRepositories(this.databaseClients)
		this.logger.info('DependencyContainer: Repositories loaded.')
	}
}

export const dependencyContainer = new DependencyContainerClass()
export type DependencyContainer = InstanceType<typeof DependencyContainerClass>
